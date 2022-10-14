import React, { Suspense, useEffect, useState } from "react";
import "./App.css";
import Nav from "./Nav";
import DateCard from "./DateCard";
import Weather, { fetchInfo } from "./Weather";
import defaultCities, { STORAGE_KEY_CITIES } from "./defaultCities";

const themes = {
  light: { name: "light", foreground: "#000000", background: "#eeeeee" },
  dark: { name: "dark", foreground: "#ffffff", background: "#222222" },
};
const ThemeContext = React.createContext(themes.light);

const AsyncCompnent = React.lazy(() =>
  import(/* webpackPreload:true */ "./AsyncComponent.css").then(() =>
    import(/* webpackChunkName: 'async-component' */ "./AsyncComponent")
  )
);

export default function App(props) {
  const [adcodes, setAdcodes] = useState(props.adcodes);
  const [lives, setLives] = useState(props.lives);
  const isMine = props.route.destination === "/mine.html";
  useEffect(() => {
    (async () => {
      if (isMine) {
        let data = localStorage.getItem(STORAGE_KEY_CITIES);
        if (data) {
          const keys = JSON.parse(data).map(({ adcode }) => adcode);
          const infos = await Promise.all(keys.map((city) => fetchInfo(city)));
          setLives(infos);
          setAdcodes(keys);
          return;
        }
      }
      setLives(props.lives);
      setAdcodes(props.adcodes);
    })();
  }, [props.route]);
  return (
    <>
      <Nav render={props.render} route={props.route}></Nav>

      {!isMine && <DateCard date={props.date}></DateCard>}

      {adcodes.map((adcode, index) => (
        <Weather
          key={adcode}
          city={adcode}
          lives={lives.find((item) => item.adcode === adcode)}
        ></Weather>
      ))}

      {!isMine && (
        <div className="container">
          <ThemeContext.Provider value={themes.dark}>
            <Suspense fallback={<div>加载中...</div>}>
              <AsyncCompnent />
            </Suspense>
          </ThemeContext.Provider>
        </div>
      )}
    </>
  );
}

App.getInitialData = async (props) => {
  const isMine = props.route.destination === "/mine.html";
  const adcodes = isMine ? [] : defaultCities;
  const lives = await Promise.all(adcodes.map((city) => fetchInfo(city)));
  return { date: Date.now(), adcodes, lives };
};

App.ThemeContext = ThemeContext;
