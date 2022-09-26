import React, { Suspense } from "react";
import DateCard from "./DateCard";
import Weather from "./Weather";
import "./App.css";

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
      <DateCard date={props.date}></DateCard>

      <Weather initialCity="110000"></Weather>
      <Weather initialCity="310000"></Weather>
      <Weather initialCity="500000"></Weather>
      <Weather initialCity="341881"></Weather>

      <ThemeContext.Provider value={themes.dark}>
        <Suspense fallback={<div>Loading...</div>}>
          {/* <AsyncCompnent /> */}
        </Suspense>
      </ThemeContext.Provider>
    </>
  );
}

App.getInitialData = () => {
  return { date: Date.now() };
};

App.ThemeContext = ThemeContext;

export default App;
