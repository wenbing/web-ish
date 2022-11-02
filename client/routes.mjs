import { pathToRegexp } from "path-to-regexp";
import paths from "./paths.js";

export const { publicPath } = paths;

export const routes = [
  {
    name: "app",
    source: "/(index)?(\\.html)?",
    destination: "/index.html",
    Component: () => import(/* webpackChunkName: 'app' */ "./App.js"),
  },
  {
    name: "mine",
    source: "/mine(\\.html)?",
    destination: "/mine.html",
    Component: () => import(/* webpackChunkName: 'app' */ "./App.js"),
  },
  {
    name: "setting",
    source: "/setting(\\.html)?",
    destination: "/setting.html",
    Component: () => import(/* webpackChunkName: 'setting' */ "./Setting.js"),
  },
  {
    name: "weixin",
    source: "/weixin",
    destination: "/weixin.html",
    Component: () => import(/* webpackChunkName: 'weixin' */ "./Weixin.mjs"),
  },
];

/** @NOTICE notfound SHOULD defined after routes */
export const notfound = {
  name: "404",
  source: "(.*)",
  destination: "/404.html",
  Component: () => import(/* webpackChunkName: 'notfound' */ "./NotFound.mjs"),
};

[].concat(routes, notfound).forEach((item) => {
  const { source, Component: mod } = item;
  item.source = pathToRegexp(source);
  item.Component = () => mod().then((m) => m.default);
});

export function match(url) {
  const searchPosition = url.indexOf("?");
  const [pathname, search] =
    searchPosition === -1
      ? [url, ""]
      : [url.slice(0, searchPosition), url.slice(searchPosition)];
  if (!pathname.startsWith(publicPath)) {
    const { name, Component } = notfound;
    return { name, Component, pathname, search, destination: null };
  }
  const striped = pathname.slice(publicPath.length);
  const len = routes.length;
  for (let i = 0; i < len; i++) {
    const route = routes[i];
    const matched = striped.match(route.source);
    if (matched) {
      return {
        name: route.name,
        Component: route.Component,
        pathname: striped,
        search,
        destination: route.destination,
      };
    }
  }
  const { name, Component } = notfound;
  return { name, Component, pathname: striped, search, destination: null };
}
