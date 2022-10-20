export const publicPath = "/web-ish";

export const routes = [
  {
    name: "app",
    source: /^\/(?:index(?:\.html)?)?(?:\/)?$/i,
    destination: "/index.html",
    Component: import("./App").then((m) => m.default),
  },
  {
    name: "mine",
    source: /^\/(?:mine(?:\.html)?)?(?:\/)?$/i,
    destination: "/mine.html",
    Component: import("./App").then((m) => m.default),
  },
  {
    name: "setting",
    source: /^\/setting(?:\.html)?(?:\/)?$/i,
    destination: "/setting.html",
    Component: import(
      /* webpackPrefetch:true, webpackChunkName: 'setting' */ "./Setting"
    ).then((m) => m.default),
  },
];

export function match(url) {
  const searchPosition = url.indexOf("?");
  const [pathname, search] =
    searchPosition === -1
      ? [url, ""]
      : [url.slice(0, searchPosition), url.slice(searchPosition)];
  if (!pathname.startsWith(publicPath)) {
    return { pathname, search, destination: null };
  }
  const striped = pathname.slice(publicPath.length);
  const len = routes.length;
  for (let i = 0; i < len; i++) {
    const route = routes[i];
    const matched = striped.match(route.source);
    if (matched) {
      return Object.assign({}, route, { pathname: striped, search });
    }
  }
  return { pathname: striped, search, destination: null };
}
