import paths from "./paths.js";
const notfound = {
  name: "404",
  Component: () =>
    import(/* webpackChunkName: 'notfound' */ "./NotFound.mjs").then(
      (m) => m.default
    ),
};

export const { publicPath } = paths;

export const routes = [
  {
    name: "app",
    source: /^\/(?:index(?:\.html)?)?(?:\/)?$/i,
    destination: "/index.html",
    Component: () =>
      import(/* webpackChunkName: 'app' */ "./App.js").then((m) => m.default),
  },
  {
    name: "mine",
    source: /^\/(?:mine(?:\.html)?)?(?:\/)?$/i,
    destination: "/mine.html",
    Component: () =>
      import(/* webpackChunkName: 'app' */ "./App.js").then((m) => m.default),
  },
  {
    name: "setting",
    source: /^\/setting(?:\.html)?(?:\/)?$/i,
    destination: "/setting.html",
    Component: () =>
      import(/* webpackChunkName: 'setting' */ "./Setting.js").then(
        (m) => m.default
      ),
  },
];

export function match(url) {
  const searchPosition = url.indexOf("?");
  const [pathname, search] =
    searchPosition === -1
      ? [url, ""]
      : [url.slice(0, searchPosition), url.slice(searchPosition)];
  if (!pathname.startsWith(publicPath)) {
    return { ...notfound, pathname, search, destination: null };
  }
  const striped = pathname.slice(publicPath.length);
  const len = routes.length;
  for (let i = 0; i < len; i++) {
    const route = routes[i];
    const matched = striped.match(route.source);
    if (matched) {
      return {
        name: route.name,
        // source: route.source,
        destination: route.destination,
        Component: route.Component,
        pathname: striped,
        search,
      };
    }
  }
  return { ...notfound, pathname: striped, search, destination: null };
}
