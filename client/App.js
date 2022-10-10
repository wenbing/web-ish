import React, { Suspense, useEffect, useState } from "react";
import "./App.css";
import Nav from "./Nav";
import DateCard from "./DateCard";
import Weather from "./Weather";
import defaultCities, { STORAGE_KEY_CITIES } from "./defaultCities";

const themes = {
  light: {
    foreground: "#000000",
    background: "#eeeeee",
  },
  dark: {
    foreground: "#ffffff",
    background: "#222222",
  },
};
const ThemeContext = React.createContext(themes.light);
const AsyncCompnent = React.lazy(() =>
  import(/* webpackChunkName: 'async-component' */ "./AsyncComponent")
);

function App(props) {
  const [adcodes, setAdcodes] = useState(props.adcodes);
  useEffect(() => {
    const data = localStorage.getItem(STORAGE_KEY_CITIES);
    if (data) setAdcodes(JSON.parse(data).map(({ adcode }) => adcode));
  }, []);
  return (
    <>
      <Nav render={props.render} route={props.route}></Nav>
      <DateCard date={props.date}></DateCard>

      {adcodes.map((adcode) => (
        <Weather key={adcode} initialCity={adcode}></Weather>
      ))}

      <ThemeContext.Provider value={themes.dark}>
        <Suspense fallback={<div>Loading...</div>}>
          {/* <AsyncCompnent /> */}
        </Suspense>
      </ThemeContext.Provider>
    </>
  );
}

App.getInitialData = () => {
  return { date: Date.now(), adcodes: defaultCities };
};

App.ThemeContext = ThemeContext;

export default App;
