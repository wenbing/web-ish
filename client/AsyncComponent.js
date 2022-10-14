import React, { useContext, useEffect, useState } from "react";
import App from "./App";
// import "./AsyncComponent.css";

function AsyncCompnent() {
  const theme = useContext(App.ThemeContext);
  const [count, setCount] = useState(0);
  return (
    <div className="block block-count">
      <div
        className={`theme-${theme.name}`}
        onClick={() => setCount(count + 1)}
      >
        clicked <span className="count">{count}</span> times
      </div>
    </div>
  );
}

export default AsyncCompnent;
