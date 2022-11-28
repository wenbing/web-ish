import { useContext, useState } from "react";
import "./AsyncComponent.css";
import App from "../App";

function AsyncCompnent() {
  const theme = useContext(App.ThemeContext);
  const [count, setCount] = useState(0);
  return (
    <div className="card-count">
      <div
        className={`theme-${theme.name}`}
        onClick={() => setCount(count + 1)}
      >
        clicked <span className="card-count__count">{count}</span> times
      </div>
    </div>
  );
}

export default AsyncCompnent;
