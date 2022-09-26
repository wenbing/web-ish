import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import * as css from "./main.css";

if (process.env.NODE_ENV === "development") {
  import("./tape-test");
}

const appProps = window.INITIAL_DATA;
console.log(appProps);
const app = <App {...appProps} />;

const root = ReactDOM.hydrateRoot(document.getElementById("app"), app);
