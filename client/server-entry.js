import fs from "fs";
import path from "path";
import { Writable } from "stream";
import React from "react";
import { renderToPipeableStream } from "react-dom/server";

import { match } from "./routes";
import App from "./App";

export async function createError(opts) {
  const { error, serverDir, publicDir, pathname } = opts;
  const stats = JSON.parse(
    fs.readFileSync(path.join(serverDir, "stats.json")).toString()
  );
  const { publicPath } = stats;
  const assets = getAssets({
    assets: stats.entrypoints.error.assets,
    publicDir,
    publicPath,
    fileSystem: opts.fs || fs,
  });
  const route = match(pathname);
  const initialData = {
    route: { pathname: route.pathname, destination: route.destination },
  };
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
  const { serverDir, publicDir, pathname } = opts;
  const stats = JSON.parse(
    fs.readFileSync(path.join(serverDir, "stats.json")).toString()
  );
  const { publicPath } = stats;
  const route = match(pathname);
  const initialData = {
    route: {
      pathname: route.pathname,
      destination: route.destination,
    },
  };
  let Component;
  if (route.destination) {
    Component = await route.component;
  } else {
    Component = App;
  }
  let appData = {};
  if (typeof Component.getInitialData === "function") {
    appData = await Component.getInitialData();
  }
  if (route.destination) {
    initialData[route.name] = appData;
  }
  const app = <Component route={initialData.route} {...appData} />;
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
  // route.name webpackChunkName webpackPreload 相符合，可以加载到html中
  if (route && clientStats.children.preload) {
    const preloadByName = clientStats.children.preload.reduce(
      (acc, item) => Object.assign(acc, { [item.name]: item }),
      {}
    );
    if (preloadByName[route.name]) {
      clientAssets = clientAssets.concat(preloadByName[route.name].assets);
    }
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
