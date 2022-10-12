import React, { Suspense, useEffect, useState } from "react";
import "./App.css";
import Nav from "./Nav";
import DateCard from "./DateCard";
import Weather, { fetchInfo } from "./Weather";
import defaultCities, { STORAGE_KEY_CITIES } from "./defaultCities";

const themes = {
  light: { foreground: "#000000", background: "#eeeeee" },
  dark: { foreground: "#ffffff", background: "#222222" },
};
const ThemeContext = React.createContext(themes.light);

const AsyncCompnent = React.lazy(() =>
  import(/* webpackChunkName: 'async-component' */ "./AsyncComponent")
);

function App(props) {
  const [adcodes, setAdcodes] = useState(props.adcodes);
  useEffect(() => {
    const data = localStorage.getItem(STORAGE_KEY_CITIES);
    if (!data) return;
    setAdcodes(JSON.parse(data).map(({ adcode }) => adcode));
  }, []);
  return (
    <>
      <Nav render={props.render} route={props.route}></Nav>
      <DateCard date={props.date}></DateCard>

      {adcodes.map((adcode, index) => (
        <Weather
          key={adcode}
          city={adcode}
          lives={props.lives.find((item) => item.adcode === adcode)}
        ></Weather>
      ))}

      <ThemeContext.Provider value={themes.dark}>
        <Suspense fallback={<div>Loading...</div>}>
          {/* <AsyncCompnent /> */}
        </Suspense>
      </ThemeContext.Provider>
    </>
  );
}

App.getInitialData = async () => {
  const lives = await Promise.all(defaultCities.map((city) => fetchInfo(city)));
  return { date: Date.now(), adcodes: defaultCities, lives };
};

App.ThemeContext = ThemeContext;

export default App;
