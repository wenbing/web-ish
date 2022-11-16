import ReactDOM from "react-dom/client";

import { match } from "./shared_routes.mjs";
import "./client.css";

const INITIAL_DATA = window.INITIAL_DATA;

function clone<T>(o: T, init = {}) {
  return Object.keys(o).reduce((acc, key) => {
    if (Array.isArray(o[key])) return { ...acc, [key]: [...o[key]] };
    if (typeof o[key] === "object") return { ...acc, [key]: { ...o[key] } };
    return { ...acc, [key]: o[key] };
  }, init as T);
}

(async function main() {
  async function init() {
    const matched = await match(INITIAL_DATA.url);
    const Component = await matched.Component();
    const route = { ...matched, Component };
    const props = {
      ...clone(INITIAL_DATA),
      route,
      render,
    };
    console.log("init props", props);
    return [Component, props];
  }

  async function update(loc) {
    const matched = await match(`${loc.pathname}${loc.search}`);
    const Component = await matched.Component();
    const route = { ...matched, Component };
    let data;
    if (typeof Component.getInitialData === "function") {
      try {
        data = await Component.getInitialData({
          ...clone(INITIAL_DATA),
          route,
        });
      } catch (ex) {
        console.error(ex);
      }
    }
    props = { ...clone(INITIAL_DATA), ...data, route, render };
    console.log("update props", props);
    return [Component, props];
  }

  const container = document.getElementById("app");
  let Component;
  let props;
  [Component, props] = await init();
  const root = ReactDOM.hydrateRoot(container, <Component {...props} />);
  async function render(loc) {
    root.render(<Component isLoading={true} {...props} />);
    [Component, props] = await update(loc);
    root.render(<Component {...props} />);
  }

  window.addEventListener("popstate", async () => {
    await render(document.location);
  });
})();
