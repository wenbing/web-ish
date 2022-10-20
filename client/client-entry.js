import React, { useState } from "react";
import ReactDOM from "react-dom/client";

import App from "./App";
import { match, publicPath } from "./routes";
import icon from "./icon.png";
if (process.env.NODE_ENV === "development") {
  import("./tape-test");
}
const INITIAL_DATA = window.INITIAL_DATA;

function Bootstrap({ Component, isLoading, ...props }) {
  return <Component isLoading={isLoading} {...props} />;
}

(async function main() {
  async function init() {
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
      Component = await route.Component;
      data = INITIAL_DATA[route.name];
    } else {
      Component = App;
      data = await Component.getInitialData(initProps);
    }
    const props = Object.assign({}, initProps, data, {
      render: handleRender,
    });
    console.log("init props", JSON.stringify(props, null, 2));
    return [Component, props];
  }

  async function update({ pathname, search }) {
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
      Component = await route.Component;
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
    const props = Object.assign({}, initProps, data, {
      render: handleRender,
    });
    console.log("update Props", JSON.stringify(props, null, 2));
    return [Component, props];
  }

  let Component;
  let props;
  const container = document.getElementById("app");
  [Component, props] = await init();
  const root = ReactDOM.hydrateRoot(container, <Component {...props} />);
  async function handleRender(loc) {
    root.render(<Component isLoading={true} {...props} />);
    [Component, props] = await update(loc);
    root.render(<Component {...props} />);
  }

  window.addEventListener("popstate", async (event) => {
    const location = event.target.location;
    await handleRender(location);
  });
})();
