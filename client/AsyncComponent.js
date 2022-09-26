import React, { useContext, useEffect, useState } from "react";
import App from "./App";
import "./AsyncComponent.css";

function AsyncCompnent() {
  const theme = useContext(App.ThemeContext);
  const [count, setCount] = useState(0);
  useEffect(() => {
    document.title = `You clicked ${count} times`;
  });
  return (
    <>
      <p>You clicked {count} times already!</p>
      <button
        className="async-button"
        style={{ background: theme.background, color: theme.foreground }}
        onClick={() => setCount(count + 1)}
      >
        Click me
      </button>
      <div className="async-component">The Async Component!</div>
    </>
  );
}

export default AsyncCompnent;
