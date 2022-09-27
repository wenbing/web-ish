import path from "path-browserify";
import React from "react";
import ReactDOM, { createRoot } from "react-dom/client";

import App from "./App";
import * as css from "./main.css";
import { match, publicPath } from "./routes";

if (process.env.NODE_ENV === "development") {
  import("./tape-test");
}

const INITIAL_DATA = window.INITIAL_DATA;
console.log(INITIAL_DATA);

(async function main() {
  async function initApp() {
    const route = match(`${publicPath}${INITIAL_DATA.route.pathname}`);
    const Component = route.destination ? await route.component : App;
    const data = route.destination ? INITIAL_DATA[route.name] : {};
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
    let appProps = { render: handleRender };
    if (route.destination) {
      Component = await route.component;
      Object.assign(appProps, {
        route: { pathname: route.pathname, destination: route.destination },
      });
      if (typeof Component.getInitialData === "function") {
        Object.assign(appProps, await Component.getInitialData());
      }
    } else {
      Component = App;
      Object.assign(appProps, {
        route: { pathname: route.pathname, destination: route.destination },
      });
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
