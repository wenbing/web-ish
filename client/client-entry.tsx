import ReactDOM from "react-dom/client";

import { match, publicPath } from "./shared_routes.mjs";
import "./client.css";
import "./favicon.webp";
import "./favicon_x192.webp";
// import "./favicon_x512.webp";
import "./favicon_x512.png";

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
      const clientHeaders = pickHeadersFromCookie(["x-request-id", "token"]);
      try {
        data = await Component.getInitialData({
          ...clone(INITIAL_DATA),
          ...clientHeaders,
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

  if ("serviceWorker" in navigator) {
    try {
      const swUri = `${publicPath}/sw.js`;
      const swOpts = { scope: "/web-ish/", updateViaCache: "none" as const };
      await navigator.serviceWorker.register(swUri, swOpts);
    } catch (error) {
      console.error(`[service worker registration] failed:`, { error });
    }
  }
})();

function pick(o, keys) {
  return keys.reduce((acc, key) => {
    if (o[key] === undefined) {
      return acc;
    } else {
      return { ...acc, [key]: o[key] };
    }
  }, {});
}

function pickHeadersFromCookie(keys) {
  const cookies = document.cookie
    .split(";")
    .map((s) => s.trim())
    .reduce((acc, item) => {
      const pair = item.split("=");
      return { ...acc, [pair[0]]: decodeURIComponent(pair[1]) };
    }, {});
  return pick(cookies, keys);
}
