import { useContext, useState } from "react";
import App from "./App";

function AsyncCompnent() {
  const theme = useContext(App.ThemeContext);
  const [count, setCount] = useState(0);
  return (
    <div className="card card-count">
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
