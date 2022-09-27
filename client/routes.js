import React from "react";

export const pagesPublicPath = require("./pagesPublicPath");

export const routes = [
  {
    name: "app",
    source: /^\/(?:index(?:\.html)?)?(?:\/)?$/i,
    destination: "/index.html",
    component: import("./App").then((m) => m.default),
  },
  {
    name: "setting",
    source: /^\/setting(?:\.html)?(?:\/)?$/i,
    destination: "/setting.html",
    component: import(
      /* webpackPreload:true, webpackChunkName: 'setting' */ "./Setting"
    ).then((m) => m.default),
  },
];

export function match(pathname) {
  if (!pathname.startsWith(pagesPublicPath)) {
    return { pathname, destination: null };
  }
  const striped = pathname.slice(pagesPublicPath.length);
  const len = routes.length;
  for (let i = 0; i < len; i++) {
    const route = routes[i];
    const matched = striped.match(route.source);
    if (matched) {
      return Object.assign({}, route, { pathname: striped });
    }
  }
  return { pathname: striped, destination: null };
}
