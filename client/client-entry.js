import React from "react";
import ReactDOM from "react-dom/client";

import "./client.css";
import { match, publicPath } from "./routes.mjs";
import icon from "./icon.png";

const searchParams = new URLSearchParams(location.search);
if (process.env.NODE_ENV === "development" && searchParams.has("istest")) {
  import("./tape-test");
}
const INITIAL_DATA = window.INITIAL_DATA;

(async function main() {
  async function init() {
    const route = match(
      `${publicPath}${INITIAL_DATA.route.pathname}${INITIAL_DATA.route.search}`
    );
    const Component = await route.Component();
    let props = {
      builtAt: INITIAL_DATA.builtAt,
      isStatic: INITIAL_DATA.isStatic,
      favicon: icon,
      route: { ...INITIAL_DATA.route, Component },
      render: handleRender,
    };
    const data = { ...INITIAL_DATA[route.name] };
    props = { ...data, ...props };
    console.log("init props", JSON.stringify(props, null, 2));
    return [Component, props];
  }

  async function update(loc) {
    const route = match(`${loc.pathname}${loc.search}`);
    const Component = await route.Component();
    let props = {
      builtAt: INITIAL_DATA.builtAt,
      isStatic: INITIAL_DATA.isStatic,
      favicon: icon,
      route: { ...route, Component },
      render: handleRender,
    };
    let data;
    if (typeof Component.getInitialData === "function") {
      try {
        data = await Component.getInitialData(props);
      } catch (ex) {
        console.error(ex);
        data = { ...INITIAL_DATA[route.name] };
      }
    } else {
      data = { ...INITIAL_DATA[route.name] };
    }
    props = { ...data, ...props };
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
