import * as React from "react";
import { useState, useEffect, Suspense } from "react";
import "./App.css";
import Nav from "./Nav";
import Loading from "./Loading";
import DateCard from "./DateCard";
import Weather, { fetchInfo, WeatherLives } from "./Weather";
import defaultCities, { STORAGE_KEY_CITIES } from "./defaultCities";
import withErrorBoundary from "./withErrorBoundary";
import { RouteProps, RouteComponent } from "./routes";

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
  adcodes: string[];
  lives: WeatherLives[];
}

function Home(props: AppProps) {
  const [adcodes, setAdcodes] = useState(props.adcodes);
  const [lives, setLives] = useState(props.lives);
  useEffect(() => {
    (async () => {
      if (props.isStatic) {
        const keys = props.adcodes;
        const infos = await Promise.all(keys.map((city) => fetchInfo(city)));
        setLives(infos);
        setAdcodes(keys);
      } else {
        setLives(props.lives);
        setAdcodes(props.adcodes);
      }
    })();
  }, [props.route]);
  return (
    <div className="cards">
      <DateCard date={props.date}></DateCard>

      {adcodes.map((adcode) => (
        <Weather
          key={adcode}
          city={adcode}
          lives={lives.find((item) => item.adcode === adcode)}
        ></Weather>
      ))}

      <ThemeContext.Provider value={themes.dark}>
        <Suspense fallback={<div>加载中...</div>}>
          <AsyncCompnent />
        </Suspense>
      </ThemeContext.Provider>
    </div>
  );
}

function Mine(props: AppProps) {
  const [adcodes, setAdcodes] = useState(props.adcodes);
  const [lives, setLives] = useState(props.lives);
  useEffect(() => {
    (async () => {
      const data = localStorage.getItem(STORAGE_KEY_CITIES);
      if (data) {
        const keys = JSON.parse(data).map(({ adcode }) => adcode);
        const infos = await Promise.all(keys.map((city) => fetchInfo(city)));
        setLives(infos);
        setAdcodes(keys);
      } else {
        setLives(props.lives);
        setAdcodes(props.adcodes);
      }
    })();
  }, [props.route]);
  return (
    <div className="cards">
      {adcodes.map((adcode) => (
        <Weather
          key={adcode}
          city={adcode}
          lives={lives.find((item) => item.adcode === adcode)}
        ></Weather>
      ))}
    </div>
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
    contents = isMine ? <Mine {...props} /> : <Home {...props} />;
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
  const adcodes = isMine ? [] : defaultCities;
  const { isStatic } = props;
  const lives = await Promise.all(
    adcodes.map((city) => fetchInfo(city, { isStatic }))
  );
  return { date: Date.now(), adcodes, lives };
};

export default App;
