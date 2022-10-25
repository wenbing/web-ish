import fs from "fs";
import path from "path";
import { Writable } from "stream";
import React from "react";
import { renderToPipeableStream } from "react-dom/server";

import { match } from "./routes.mjs";
import icon from "./icon.png";

export { publicPath } from "./paths";

export async function createError(opts) {
  const { error, serverlibDir, publicDir, url } = opts;
  const stats = JSON.parse(
    fs.readFileSync(path.join(serverlibDir, "stats.json")).toString()
  );
  const { builtAt, publicPath } = stats;
  const assets = getAssets({
    assets: stats.entrypoints.error.assets,
    publicDir,
    publicPath,
    fileSystem: opts.fs || fs,
  });
  const route = match(url);
  const { pathname, search, destination } = route;
  const initProps = {
    builtAt,
    favicon: icon,
    route: { pathname, search, destination },
  };
  let initialData = { ...initProps };
  initialData = JSON.stringify(initialData);
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
    <script>window.INITIAL_DATA = ${initialData}</script>
    ${assets.body.join("\n\t\t")}
  </body>
</html>
    `;
  return doc;
}

export async function createDoc(opts) {
  const { serverlibDir, publicDir, url, isStatic } = opts;
  const stats = JSON.parse(
    fs.readFileSync(path.join(serverlibDir, "stats.json")).toString()
  );
  const { builtAt, publicPath } = stats;
  const route = match(url);
  let { Component } = route;
  Component = await route.Component();
  const getProps = () => ({
    builtAt,
    isStatic,
    favicon: icon,
    route: { ...route, Component },
  });
  let data;
  if (typeof Component.getInitialData === "function") {
    data = await Component.getInitialData(getProps());
  }
  let initialData = { ...getProps(), [route.name]: data };
  initialData = JSON.stringify(initialData, null, 2);
  const props = { ...data, ...getProps() };
  const app = <Component {...props} />;
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
  const { namedChunkGroups } = stats;
  let clientAssets = namedChunkGroups.client.assets;
  // Component.name.toLowerCase() webpackChunkName 相符合，可以加载到html中
  const webpackChunkName = Component.name.toLowerCase();
  if (namedChunkGroups[webpackChunkName]) {
    clientAssets = clientAssets.concat(
      namedChunkGroups[webpackChunkName].assets
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
    <script>
window.INITIAL_DATA = ${initialData}
    </script>
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
          acc.header.push(
            `<style data-href="${publicPath}${item.name}">${style}</style>`
          );
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
