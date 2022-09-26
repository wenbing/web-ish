import React, { Suspense, useEffect, useState } from "react";
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
  const [date, setDate] = useState(props.date);
  useEffect(() => {
    const intervalID = setInterval(() => {
      setDate(Date.now());
    }, 1000);
    return () => {
      clearInterval(intervalID);
    };
  });
  const time = new Date(date).toLocaleTimeString();
  return (
    <div className="container">
      <ThemeContext.Provider value={themes.dark}>
        <h2 className="time-block">
          <span className="lcdd-font">{time}</span>
        </h2>
        <Suspense fallback={<div>Loading...</div>}>
          <AsyncCompnent />
        </Suspense>
      </ThemeContext.Provider>
    </div>
  );
}

App.getInitialData = () => {
  return { date: Date.now() };
};

App.ThemeContext = ThemeContext;

export default App;
