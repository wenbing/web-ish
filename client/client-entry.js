import React from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { match, publicPath } from "./routes";
import icon from "./icon.png";

if (process.env.NODE_ENV === "development") {
  import("./tape-test");
}

const INITIAL_DATA = window.INITIAL_DATA;

(async function main() {
  async function initApp() {
    const route = match(
      `${publicPath}${INITIAL_DATA.route.pathname}${INITIAL_DATA.route.search}`
    );
    const initProps = {
      favicon: icon,
      builtAt: INITIAL_DATA.builtAt,
      route: INITIAL_DATA.route,
    };
    if (INITIAL_DATA.isStatic !== undefined) {
      initProps.isStatic = INITIAL_DATA.isStatic;
    }
    let Component;
    let data;
    if (route.destination) {
      Component = await route.component;
      data = INITIAL_DATA[route.name];
    } else {
      Component = App;
      // if (typeof Component.getInitialData === "function") {}
      data = await Component.getInitialData(initProps);
    }
    const appProps = Object.assign({}, initProps, data, {
      render: handleRender,
    });
    console.log("init appProps", JSON.stringify(appProps, null, 2));
    return <Component {...appProps} />;
  }

  async function createApp({ pathname, search }) {
    const route = match(`${pathname}${search}`);
    let Component;
    let initProps = {
      favicon: icon,
      builtAt: INITIAL_DATA.builtAt,
      route: {
        pathname: route.pathname,
        search: route.search,
        destination: route.destination,
      },
    };
    if (INITIAL_DATA.isStatic !== undefined) {
      initProps.isStatic = INITIAL_DATA.isStatic;
    }
    let name;
    if (route.destination) {
      Component = await route.component;
      name = route.name;
    } else {
      Component = App;
      name = "app";
    }
    let data;
    if (typeof Component.getInitialData === "function") {
      try {
        data = await Component.getInitialData(initProps);
      } catch (ex) {
        console.error(ex);
      }
      data = Object.assign({}, INITIAL_DATA[name], data);
    }
    const appProps = Object.assign({}, initProps, data, {
      render: handleRender,
    });
    console.log("render appProps", JSON.stringify(appProps, null, 2));
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
