import React from "react";
import { pathToRegexp } from "path-to-regexp";
import paths from "./paths";

export const { publicPath } = paths;

interface GetInitialData {
  // (props: RouteProps): Record<string, unknown>;
  (props: RouteProps): Promise<Record<string, unknown>>;
}

type RouteLocation = { pathname: string; search: string };
export type RouteComponent = React.ComponentType<RouteProps> & {
  getInitialData?: GetInitialData;
  title?: string;
  ThemeContext?: React.Context<Record<string, unknown>>;
};

interface DefinedRoute {
  name: string;
  source: RegExp;
  destination: string;
  Component: () => Promise<RouteComponent>;
}

export interface MatchedRoute {
  name: string;
  pathname: string;
  search: string;
  destination: string | null;
  Component: () => Promise<RouteComponent>;
}

export interface Route {
  name: string;
  pathname: string;
  search: string;
  destination: string | null;
  Component: RouteComponent;
}

export interface RouteProps {
  url: string;
  headers: Record<string, string>;
  builtAt: number;
  favicon: string;
  route: Route;
  render: (loc: RouteLocation) => void;
  error?: Error;
  isStatic?: boolean;
  isLoading?: boolean;
}

const importDefault = (item): DefinedRoute => {
  const source = pathToRegexp(item.source);
  const Component = () => item.Component().then((m) => m.default);
  return { ...item, source, Component };
};

export const routes: DefinedRoute[] = [
  {
    name: "app",
    source: "/(index)?(\\.html)?",
    destination: "/index.html",
    Component: () => import(/* webpackChunkName: 'app' */ "./App"),
  },
  {
    name: "mine",
    source: "/mine(\\.html)?",
    destination: "/mine.html",
    Component: () => import(/* webpackChunkName: 'app' */ "./App"),
  },
  {
    name: "setting",
    source: "/setting(\\.html)?",
    destination: "/setting.html",
    Component: () => import(/* webpackChunkName: 'setting' */ "./Setting"),
  },
  {
    name: "weixin",
    source: "/weixin(\\.html)?",
    destination: "/weixin.html",
    Component: () => import(/* webpackChunkName: 'weixin' */ "./Weixin"),
  },
].map(importDefault);

/** @NOTICE notfound SHOULD defined after routes */
export const notfound = importDefault({
  name: "404",
  source: "(.*)",
  destination: "/404.html",
  Component: () => import(/* webpackChunkName: 'notfound' */ "./NotFound"),
});

export function match(url: string): MatchedRoute {
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
