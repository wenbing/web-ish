import path from "path-browserify";
import React from "react";
import ReactDOM, { createRoot } from "react-dom/client";

import App from "./App";
import { match, pagesPublicPath } from "./routes";
import icon from "./icon.png";

if (process.env.NODE_ENV === "development") {
  import("./tape-test");
}

const INITIAL_DATA = window.INITIAL_DATA;

(async function main() {
  async function initApp() {
    const route = match(
      `${pagesPublicPath}${INITIAL_DATA.route.pathname}${INITIAL_DATA.route.search}`
    );
    let Component;
    let data;
    if (route.destination) {
      Component = await route.component;
      data = INITIAL_DATA[route.name];
    } else {
      Component = App;
      // if (typeof Component.getInitialData === "function") {}
      data = await Component.getInitialData();
    }
    const appProps = {
      favicon: icon,
      route: INITIAL_DATA.route,
      render: handleRender,
      ...data,
    };
    console.log("init appProps", appProps);
    return <Component {...appProps} />;
  }

  async function createApp({ pathname, search }) {
    const route = match(`${pathname}${search}`);
    let Component;
    let appProps = {
      favicon: icon,
      route: {
        pathname: route.pathname,
        search: route.search,
        destination: route.destination,
      },
      render: handleRender,
    };
    let appName;
    if (route.destination) {
      Component = await route.component;
      appName = route.name;
    } else {
      Component = App;
      appName = "app";
    }

    if (typeof Component.getInitialData === "function") {
      let data;
      try {
        data = await Component.getInitialData();
      } catch (ex) {
        console.error(ex);
      }
      Object.assign(appProps, INITIAL_DATA[appName], data);
    }
    console.log("render appProps", appProps);
    return <Component {...appProps} />;
  }

  const container = document.getElementById("app");
  const root = ReactDOM.hydrateRoot(container, await initApp());

  async function handleRender(loc) {
    const app = await createApp(loc);
    root.render(app);
  }

  window.addEventListener("popstate", async (event) => {
    const location = event.target.location;
    await handleRender(location);
  });
})();
