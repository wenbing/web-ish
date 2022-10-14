import fs from "fs";
import path from "path";
import { Writable } from "stream";
import React from "react";
import { renderToPipeableStream } from "react-dom/server";

import { match } from "./routes";
import App from "./App";
import icon from "./icon.png";

export async function createError(opts) {
  const { error, serverlibDir, publicDir, url } = opts;
  const stats = JSON.parse(
    fs.readFileSync(path.join(serverlibDir, "stats.json")).toString()
  );
  const { publicPath } = stats;
  const assets = getAssets({
    assets: stats.entrypoints.error.assets,
    publicDir,
    publicPath,
    fileSystem: opts.fs || fs,
  });
  const route = match(url);
  const initProps = {
    favicon: icon,
    route: {
      pathname: route.pathname,
      search: route.search,
      destination: route.destination,
    },
  };
  const initialData = initProps;
  const title = "Error!";
  const doc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    ${assets.header.join("\n\t\t")}
  </head>
  <body>
    <pre id="error-stack">${error.stack}</pre>
    <script>window.INITIAL_DATA = ${JSON.stringify(initialData)}</script>
    ${assets.body.join("\n\t\t")}
  </body>
</html>
    `;
  return doc;
}

export async function createDoc(opts) {
  const { serverlibDir, publicDir, url } = opts;
  const stats = JSON.parse(
    fs.readFileSync(path.join(serverlibDir, "stats.json")).toString()
  );
  const { publicPath } = stats;
  const route = match(url);
  const initProps = {
    favicon: icon,
    route: {
      pathname: route.pathname,
      destination: route.destination,
      search: route.search,
    },
  };
  const initialData = Object.assign({}, initProps);
  let Component;
  if (route.destination) {
    Component = await route.component;
  } else {
    Component = App;
  }
  let data;
  if (typeof Component.getInitialData === "function") {
    data = await Component.getInitialData(initProps);
  }
  const appProps = Object.assign({}, initProps, data);
  if (route.destination) {
    Object.assign(initialData, { [route.name]: data });
  }
  const app = <Component {...appProps} />;
  const content = await new Promise((resolve, reject) => {
    let body = "";
    const writable = new Writable({
      write(chunk, encoding, callback) {
        body += chunk;
        callback();
      },
    });
    const handleError = (error) => reject(error);
    const rs = renderToPipeableStream(app, {
      onShellError: handleError,
      // onError: handleError,
      onAllReady() {
        rs.pipe(writable).on("finish", () => {
          resolve(body);
        });
      },
    });
  });
  const clientStats = stats.entrypoints.client;
  let clientAssets = clientStats.assets;
  // route.name webpackChunkName webpackPrefetch 相符合，可以加载到html中
  if (route && clientStats.children.prefetch) {
    const prefetchByName = clientStats.children.prefetch.reduce(
      (acc, item) => Object.assign(acc, { [item.name]: item }),
      {}
    );
    if (prefetchByName[route.name]) {
      clientAssets = clientAssets.concat(prefetchByName[route.name].assets);
    }
  }
  if (clientStats.children.preload) {
    clientAssets = clientAssets.concat(
      clientStats.children.preload.reduce(
        (acc, item) => acc.concat(item.assets),
        []
      )
    );
  }
  const assets = getAssets({
    assets: clientAssets,
    publicDir,
    publicPath,
    fileSystem: opts.fs || fs,
  });

  const title = "Labs";
  const doc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="icon" type="image/png" href="${icon}">
    <link rel="apple-touch-icon" href="${icon}">
    <title>${title}</title>
    ${assets.header.join("\n\t")}
  </head>
  <body>
    <div id="app">${content}</div>
    <script>window.INITIAL_DATA = ${JSON.stringify(initialData)}</script>
    ${assets.body.join("\n\t")}
  </body>
</html>
    `;
  return doc;
}

function getAssets({ assets, publicDir, publicPath, fileSystem }) {
  return assets.reduce(
    (acc, item) => {
      const extname = path.extname(item.name);
      switch (extname) {
        case ".js":
          if (!item.name.endsWith(".hot-update.js")) {
            acc.body.push(`<script src="${publicPath}${item.name}"></script>`);
          }
          break;
        case ".css":
          const style = fileSystem
            .readFileSync(path.join(publicDir, item.name))
            .toString();
          acc.header.push(`<style>${style}</style>`);
          // acc.header.push(`<link rel="stylesheet" href="${publicPath}${item.name}" />`)
          break;
        default:
          break;
      }
      return acc;
    },
    { header: [], body: [] }
  );
}
