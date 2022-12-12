import { readFileSync } from "fs";
import path from "path";
import { v1 as uuidv1 } from "uuid";

import dirs from "./dirs.js";

const statpath = path.join(dirs.webDir, "server_lib/stats.json");
const stats = JSON.parse(readFileSync(statpath));
const { builtAt, namedChunkGroups } = stats;
const env = { NODE_ENV: process.env.NODE_ENV };

function concat() {
  return [].concat.apply([], [...arguments]);
}

function chunkGroupAssets(name) {
  const n = namedChunkGroups[name];
  if (!n) return [];
  const excludeHotUpdate = ({ name }) => {
    return path.basename(name).indexOf(".hot-update.") === -1;
  };
  return concat(n.assets.filter(excludeHotUpdate), n.auxiliaryAssets);
}

export async function handler(props) {
  const id = process.env.NODE_ENV === "development" ? uuidv1() : "";
  const { default: render } = await import(`../server_lib/render.js?id=${id}`);
  const { publicPath } = render;
  const { swCache } = await import(`./sw_cache.mjs?id=${id}`);
  const statics = await import(`./static.mjs?id=${id}`);
  const { getStaticPathnames, getStaticApinames } = statics;
  const staticPathnames = (await getStaticPathnames({ pathname: "all" })).map(
    (r) => ({ name: r.slice("/".length) })
  );
  const staticApinames = (await getStaticApinames()).map((r) => ({
    name: r.apiname.slice("/web-ish/".length),
  }));
  const cacheName = `web-ish__cache--${builtAt}`;
  const clientFiles = concat(
    [{ name: "manifest.webmanifest" }],
    staticPathnames,
    staticApinames,
    ...Object.keys(namedChunkGroups).map((name) => chunkGroupAssets(name))
  ).map(({ name }) => `${publicPath}/${name}`);
  const code = `
(${swCache.toString()})(
'${cacheName}',
${JSON.stringify(clientFiles, null, 2)},
${JSON.stringify({ publicPath, env })});
`;
  const status = 200;
  const headers = {
    "content-type": "application/javascript; charset=utf-8",
  };
  const body = code;
  return [status, headers, body];
}
