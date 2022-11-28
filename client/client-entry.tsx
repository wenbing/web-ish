import ReactDOM from "react-dom/client";

import { match } from "./shared_routes.mjs";
import "./client.css";

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
const INITIAL_DATA = window.INITIAL_DATA;

function clone<T>(o: T, init = {}) {
  return Object.keys(o).reduce((acc, key) => {
    const val = o[key];
    if (val === null) return { ...acc, [key]: val };
    if (Array.isArray(o[key])) return { ...acc, [key]: [...val] };
    if (typeof val === "object") return { ...acc, [key]: { ...val } };
    return { ...acc, [key]: val };
  }, init as T);
}

(async function main() {
  async function init() {
    const matched = await match(INITIAL_DATA.url);
    const Component = await matched.Component();
    const route = { ...matched, Component };
    const props = { ...clone(INITIAL_DATA), route, render };
    console.log("init props", props);
    return [Component, props];
  }

  async function update(loc) {
    const url = `${loc.pathname}${loc.search}`;
    const matched = await match(url);
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
    props = { ...clone(INITIAL_DATA), ...data, url, route, render };
    console.log("update props", props);
    return [Component, props];
  }

  const container = document.getElementById("app");
  let Component;
  let props;
  [Component, props] = await init();
  const root = ReactDOM.hydrateRoot(container, <Component {...props} />);
  async function render(loc) {
    window.scroll(0, 0);
    root.render(<Component isLoading={true} {...props} />);
    [Component, props] = await update(loc);
    root.render(<Component {...props} />);
  }

  window.addEventListener("popstate", async () => {
    await render(document.location);
  });
})();
