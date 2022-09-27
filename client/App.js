import React, { Suspense } from "react";
import Nav from "./Nav";
import DateCard from "./DateCard";
import Weather from "./Weather";
import "./App.css";
import defaultCities from "./defaultCities";

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
  return (
    <>
      <Nav render={props.render} route={props.route}></Nav>
      <DateCard date={props.date}></DateCard>

      {props.adcodes.map((adcode) => (
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
