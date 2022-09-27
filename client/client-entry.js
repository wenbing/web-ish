import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import * as css from "./main.css";
import { match } from "./routes";

if (process.env.NODE_ENV === "development") {
  import("./tape-test");
}

const appProps = window.INITIAL_DATA;
console.log(appProps);

const route = match(appProps.route.pathname);
(async function main() {
  let Component = route ? await route.component : App;
  const props = appProps[route.name];
  const app = <Component {...props} />;
  const root = ReactDOM.hydrateRoot(document.getElementById("app"), app);
})();
