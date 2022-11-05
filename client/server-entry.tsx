import fs from "fs";
import path from "path";
import { Writable } from "stream";
import { renderToPipeableStream } from "react-dom/server";

import icon from "./icon.png";

export { publicPath } from "./paths.js";

export function importRoutes() {
  return import(/* webpackChunkName:'routes' */ "./routes");
}

export async function createError(initials, opts) {
  const { match } = await importRoutes();
  const { url, error } = initials;
  const { serverlibDir, publicDir } = opts;
  const stats = JSON.parse(
    fs.readFileSync(path.join(serverlibDir, "stats.json")).toString()
  );
  const { builtAt } = stats;
  const assets = getAssets({
    assets: stats.namedChunkGroups.error.assets,
    publicDir,
    publicPath: stats.publicPath,
    fileSystem: opts.fs || fs,
  });
  const route = match(url);
  const { pathname, search, destination } = route;
  const initProps = {
    builtAt,
    favicon: icon,
    ...initials,
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

async function getRouteMods({ routeMods }) {
  const mods = routeMods;
  const { routes, notfound } = await importRoutes();
  await Promise.all(
    routes.map(async (item, index) => {
      mods[index].Component = await item.Component();
    })
  );
  mods[mods.length - 1].Component = await notfound.Component();
  return mods;
}

export async function createDoc(initials, opts) {
  const { match } = await importRoutes();
  const { serverlibDir, publicDir } = opts;
  const { url, isStatic, ...restInitials } = initials;
  const stats = JSON.parse(
    fs.readFileSync(path.join(serverlibDir, "stats.json")).toString()
  );
  const { builtAt } = stats;
  const route = match(url);
  const Component = await route.Component();
  const getProps = () =>
    Object.assign(
      { builtAt, favicon: icon },
      { url },
      isStatic === true ? { isStatic } : null,
      restInitials,
      { route: { ...route, Component } }
    );
  let data: Record<string, unknown> | undefined;
  if (typeof Component.getInitialData === "function") {
    data = await Component.getInitialData(getProps());
  }
  let initialData = { ...getProps(), [route.name]: data };
  initialData = JSON.stringify(initialData, null, 2);
  const props = { ...(data || {}), ...getProps() };
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
  const routeMods = await getRouteMods(stats);
  const mod = routeMods.find((item) => item.Component === Component);
  if (namedChunkGroups[mod.webpackChunkName]) {
    clientAssets = clientAssets.concat(
      namedChunkGroups[mod.webpackChunkName].assets
    );
  }

  const assets = getAssets({
    assets: clientAssets,
    publicDir,
    publicPath: stats.publicPath,
    fileSystem: opts.fs || fs,
  });

  const title = Component.title || "Labs in the garden";
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
    (
      acc: { body: string[]; header: string[] },
      item: { name: string; size: number }
    ) => {
      const extname = path.extname(item.name);
      switch (extname) {
        case ".js":
          if (!item.name.endsWith(".hot-update.js")) {
            acc.body.push(`<script src="${publicPath}${item.name}"></script>`);
          }
          break;
        case ".css":
          if (item.size > 100000) {
            acc.header.push(
              `<link rel="stylesheet" href="${publicPath}${item.name}" />`
            );
          } else {
            const style = fileSystem
              .readFileSync(path.join(publicDir, item.name))
              .toString();
            acc.header.push(
              `<style data-href="${publicPath}${item.name}">${style}</style>`
            );
          }
          break;
        default:
          break;
      }
      return acc;
    },
    { header: [], body: [] }
  );
}
