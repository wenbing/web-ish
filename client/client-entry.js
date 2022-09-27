import path from "path-browserify";
import React from "react";
import ReactDOM, { createRoot } from "react-dom/client";

import App from "./App";
import * as css from "./main.css";
import { match, pagesPublicPath } from "./routes";

if (process.env.NODE_ENV === "development") {
  import("./tape-test");
}

const INITIAL_DATA = window.INITIAL_DATA;
console.log(INITIAL_DATA);

(async function main() {
  async function initApp() {
    const route = match(`${pagesPublicPath}${INITIAL_DATA.route.pathname}`);
    const Component = route.destination ? await route.component : App;
    let data;
    if (route.destination) data = INITIAL_DATA[route.name];
    else if (typeof Component.getInitialData === "function") {
      data = await Component.getInitialData();
    }
    const appProps = {
      render: handleRender,
      route: INITIAL_DATA.route,
      ...data,
    };
    return <Component {...appProps} />;
  }

  async function createApp(pathname) {
    const route = match(pathname);
    let Component;
    let appProps = {
      render: handleRender,
      route: { pathname: route.pathname, destination: route.destination },
    };
    if (route.destination) {
      Component = await route.component;
    } else {
      Component = App;
    }
    if (typeof Component.getInitialData === "function") {
      Object.assign(appProps, await Component.getInitialData());
    }
    return <Component {...appProps} />;
  }

  const container = document.getElementById("app");
  const root = ReactDOM.hydrateRoot(container, await initApp());

  async function handleRender(pathname) {
    const app = await createApp(pathname);
    root.render(app);
  }

  window.addEventListener("popstate", async (event) => {
    const pathname = event.target.location.pathname;
    await handleRender(pathname);
  });
})();
