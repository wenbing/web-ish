import {
  pathToRegexp,
  match as ptrMatch,
  compile as ptrCompile,
} from "path-to-regexp";

import { publicPath, outputPublicPath } from "./shared_paths.js";

export { publicPath, outputPublicPath };

const user_routes = [
  {
    name: "readme",
    source: "/(readme)?(\\.html)?",
    destination: "/readme.html",
    Component: ["./App", "app"],
  },
  {
    name: "blog",
    source: "/(index)?(\\.html)?",
    destination: "/index.html",
    Component: ["./Blog", "blog"],
  },
  {
    name: "blog-post",
    source: "/post/:title([A-Za-z0-9_]+)(\\.html)?",
    destination: "/post/:title.html",
    Component: ["./Blog", "blog"],
  },
  {
    name: "mine",
    source: "/mine(\\.html)?",
    destination: "/mine.html",
    Component: ["./App", "app"],
  },
  {
    name: "setting",
    source: "/setting(\\.html)?",
    destination: "/setting.html",
    Component: ["./Setting", "setting"],
  },
  {
    name: "weixin",
    source: "/weixin(\\.html)?",
    destination: "/weixin.html",
    Component: ["./Weixin", "weixin"],
  },
];

const _notfound = {
  name: "404",
  source: "(.*)",
  destination: "/404.html",
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  Component: () => import(/* webpackMode: 'eager' */ "./NotFound.tsx"),
};

const routeSourceToRegexp = (item) => {
  const keys = [];
  const source = pathToRegexp(item.source, keys);
  const fn = ptrMatch(item.source, { decode: decodeURIComponent });

  let { destination } = item;
  if (destination.indexOf(":") !== -1) {
    destination = ptrCompile(item.source);
  }
  return { ...item, keys, match: fn, destination };
};

export { user_routes, _notfound, routeSourceToRegexp, _match };

const importDefault = (item) => ({
  ...item,
  Component: () => item.Component().then((m) => m.default),
});
const notfound = [_notfound].map(routeSourceToRegexp).map(importDefault)[0];
async function getRoutes() {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const { default: _routes } = await import("./shared_internal_routes.js");
  return _routes.map(routeSourceToRegexp).map(importDefault);
}
async function match(url) {
  const routes = await getRoutes();
  return _match(url, { routes, publicPath, notfound });
}

export { getRoutes, notfound, match };

function _match(url, { publicPath, routes, notfound }) {
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
    const matched = route.match(striped);
    if (matched) {
      const { name, Component, source, keys } = route;
      const destination =
        typeof route.destination === "function"
          ? route.destination(matched.params)
          : route.destination;
      return {
        name,
        Component,
        source,
        // keys,
        destination,
        pathname: striped,
        params: matched.params,
        search,
      };
    }
  }
  const { name, Component } = notfound;
  return { name, Component, pathname: striped, search, destination: null };
}
