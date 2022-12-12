import fs from "fs";
import path from "path";
import { Writable } from "stream";
import { renderToPipeableStream } from "react-dom/server";

import favicon from "./favicon.svg";
import { getRoutes, notfound, match, publicPath } from "./shared_routes.mjs";

export { publicPath, getRoutes, notfound };

export async function createError(initials, opts) {
  const statsPath = path.join(opts.serverlibDir, "stats.json");
  const stats = JSON.parse(fs.readFileSync(statsPath, "utf-8"));
  const { url, error } = initials;
  const headers = pick(initials.headers, [
    "host",
    "user-agent",
    "x-forwarded-proto",
    "x-requested-with",
    "theme-color",
  ]);
  const initialData = JSON.stringify({ url, headers });
  const title = "Error!";
  const assets = getAssets({
    assets: stats.namedChunkGroups.error.assets,
    publicDir: opts.publicDir,
    publicPath: stats.publicPath,
    fileSystem: opts.fs || fs,
  });
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

export async function createDoc(initials, opts) {
  const statsPath = path.join(opts.serverlibDir, "stats.json");
  const stats = JSON.parse(fs.readFileSync(statsPath, "utf-8"));
  const url = initials.url;
  const matched = await match(url);
  const Component = await matched.Component();
  const route = { ...matched, Component };
  let data: Record<string, unknown> | undefined;
  if (typeof Component.getInitialData === "function") {
    const dataProps = { url, headers: { ...initials.headers }, route };
    data = await Component.getInitialData(dataProps);
  }
  const headers = pick(initials.headers, [
    "host",
    "user-agent",
    "x-forwarded-proto",
    "x-requested-with",
    "theme-color",
  ]);
  const initialData = JSON.stringify({ url, headers, ...data }, null, 2);
  const props: RouteProps = { url, headers, route, ...data };
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

  const { publicPath, namedChunkGroups } = stats;
  let clientAssets = namedChunkGroups.client.assets;
  if (route.name !== "404") {
    const routes = await getRoutes();
    const mod = routes.find((item) => item.name === route.name);
    const chunkName = mod._Component[1];
    if (namedChunkGroups[chunkName]) {
      clientAssets = clientAssets.concat(namedChunkGroups[chunkName].assets);
    }
  }

  const assets = getAssets({
    assets: clientAssets,
    publicDir: opts.publicDir,
    publicPath,
    fileSystem: opts.fs || fs,
  });

  const title = props.title || Component.title || "Labs in the garden";
  const { light, dark } = initials.headers["theme-color"];
  const doc = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light dark">
    <meta name="theme-color" media="(prefers-color-scheme: light)" content="${light}" />
    <meta name="theme-color" media="(prefers-color-scheme: dark)" content="${dark}" />
    <link rel="icon" type="image/png" href="${favicon}" />
    <link rel="apple-touch-icon" href="${favicon}" />
    <link rel="manifest" href="${publicPath}manifest.webmanifest" />
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
            acc.body.push(
              `<script defer src="${publicPath}${item.name}"></script>`
            );
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

function pick(o, keys) {
  return keys.reduce((acc, key) => {
    if (o[key] === undefined) {
      return acc;
    } else {
      return { ...acc, [key]: o[key] };
    }
  }, {});
}
