import * as React from "react";
import { useState, useEffect, Suspense } from "react";

import Nav from "./Nav";
import Loading from "./Loading";
import DateCard from "./DateCard";
import Weather, { fetchInfo, WeatherLives } from "./Weather";
import withErrorBoundary from "./withErrorBoundary";
import { publicPath } from "./shared_routes.mjs";
import defaultCities, { STORAGE_KEY_CITIES } from "./defaultCities";
import "./App.css";

const themes = {
  light: { name: "light", foreground: "#000000", background: "#eeeeee" },
  dark: { name: "dark", foreground: "#ffffff", background: "#222222" },
};
const ThemeContext = React.createContext(themes.light);
const AsyncCompnent = React.lazy(
  () => import(/* webpackChunkName: 'async-component' */ "./AsyncComponent")
);

interface AppProps extends RouteProps {
  date: number;
  defaultAdcodes: string[];
  defaultLives: WeatherLives[];
  adcodes: string[];
  lives: WeatherLives[];
  readme?: string;
}

function Readme(props: AppProps) {
  return (
    <div
      className="readme"
      dangerouslySetInnerHTML={{ __html: props.readme }}
    />
  );
}

function Mine(props: AppProps) {
  const [adcodes, setAdcodes] = useState(props.adcodes);
  const [lives, setLives] = useState(props.lives);
  const token = props.headers.token as string;
  useEffect(() => {
    (async () => {
      const data = localStorage.getItem(STORAGE_KEY_CITIES);
      if (data) {
        const keys = JSON.parse(data).map(({ adcode }) => adcode);
        const infos = await Promise.all(
          keys.map((city) => fetchInfo(city, { token }))
        );
        setLives(infos);
        setAdcodes(keys);
      } else {
        setLives(props.lives);
        setAdcodes(props.adcodes);
      }
    })();
  }, [props.route]);

  const [defaultAdcodes, setDefaultAdcodes] = useState(props.defaultAdcodes);
  const [defaultLives, setDefaultLives] = useState(props.defaultLives);
  useEffect(() => {
    (async () => {
      const isStatic = props.headers["x-build-static"];
      if (isStatic) {
        const keys = props.defaultAdcodes;
        const infos = await Promise.all(keys.map((city) => fetchInfo(city)));
        setDefaultAdcodes(keys);
        setDefaultLives(infos);
      } else {
        setDefaultAdcodes(props.defaultAdcodes);
        setDefaultLives(props.defaultLives);
      }
    })();
  }, [props.route]);
  return (
    <>
      <div className="cards">
        <DateCard date={props.date}></DateCard>
        {defaultAdcodes.map((adcode) => (
          <Weather
            key={adcode}
            token={token}
            city={adcode}
            lives={defaultLives.find((item) => item.adcode === adcode)}
          ></Weather>
        ))}
        <ThemeContext.Provider value={themes.dark}>
          <Suspense fallback={<div>加载中...</div>}>
            <AsyncCompnent />
          </Suspense>
        </ThemeContext.Provider>
      </div>

      <div className="cards">
        {adcodes.map((adcode) => (
          <Weather
            key={adcode}
            token={token}
            city={adcode}
            lives={lives.find((item) => item.adcode === adcode)}
          ></Weather>
        ))}
      </div>
    </>
  );
}

const App: RouteComponent = withErrorBoundary((props: AppProps) => {
  const { isLoading, render, route, headers, error } = props;
  const loading = <Loading isLoading={isLoading}></Loading>;
  const nav = <Nav {...{ render, route, headers, error }}></Nav>;
  let contents;
  if (props.error) {
    contents = <div className="container">Error!</div>;
  } else {
    const isMine = props.route.destination === "/mine.html";
    contents = isMine ? <Mine {...props} /> : <Readme {...props} />;
  }
  return (
    <>
      {loading}
      {nav}
      {contents}
    </>
  );
});

App.ThemeContext = ThemeContext;

App.getInitialData = async (props) => {
  const isMine = props.route.destination === "/mine.html";
  const title = isMine ? "Mine" : "Readme";
  const token = props.headers.token as string;
  let readme;
  if (process.env.BUILD_TARGET === "node") {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    // readme = require("../server/readme.js").readme;
    readme = (await import("../server/readme.js")).readme;
  } else {
    readme =
      props.readme ||
      (await (
        await fetch(`${publicPath}/readme.json`, {
          headers: new Headers({ "x-requested-with": "fetch", token }),
        })
      ).json());
  }
  if (!isMine) {
    return { readme };
  }
  function getLives(adcodes) {
    const opts = { isStatic, token };
    return Promise.all(adcodes.map((city) => fetchInfo(city, opts)));
  }
  const date = Date.now();
  const isStatic = props.headers["x-build-static"] as boolean;
  const defaultAdcodes = defaultCities;
  const defaultLives = await getLives(defaultAdcodes);
  const adcodes = isMine ? [] : defaultAdcodes;
  const lives = await getLives(adcodes);
  return { date, defaultAdcodes, defaultLives, adcodes, lives, title };
};

export default App;
