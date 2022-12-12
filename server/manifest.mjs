import path, { normalize } from "path";
import { readFileSync } from "fs";
import etag from "etag";
import sizeOf from "image-size";
import { v1 as uuidv1 } from "uuid";

import dirs from "./dirs.js";

const statfile = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "../server_lib/stats.json"
);
const stats = JSON.parse(readFileSync(statfile, "utf-8"));
const auxiliaryAssets = stats.namedChunkGroups.client.auxiliaryAssets;

function normalizedName(item) {
  const lastPos = item.name.lastIndexOf("-");
  const name = item.name.slice(0, lastPos);
  return name;
}

export async function handler(props) {
  const id = process.env.NODE_ENV === "development" ? uuidv1() : "";
  const { default: render } = await import(`../server_lib/render.js?id=${id}`);
  const { publicPath } = render;
  const publicDir = dirs.publicDir(publicPath);

  const icons = auxiliaryAssets
    .filter((item) => normalizedName(item).startsWith("favicon"))
    .reduce((acc, item, index) => {
      const name = normalizedName(item);
      const { width, height, type } = sizeOf(path.join(publicDir, item.name));
      const src = `${publicPath}/${item.name}`;
      const sizes = `${width}x${height}`;
      const itype = `image/${type}`;
      const purpose = index === 0 ? "any" : "maskable";
      return [...acc, { src, sizes, type: itype, purpose }];
    }, []);
  const manifest = {
    name: "wenbing's blog",
    short_name: "wenbing's blog",
    lang: "zh-CN",
    start_url: "/web-ish/index.html",
    scope: publicPath,
    display_override: ["standalone"],
    display: "browser",
    theme_color: "#f5f7f0",
    background_color: "#f5f7f0",
    orientation: "portrait",
    icons,
    id: "?homescreen=1",
    description: "wenbing's blog",
    prefer_related_applications: false,
  };
  const tag = etag(JSON.stringify(manifest), {});
  const defaults = [, { "content-type": "application/manifest+json" }];
  let [status, headers, body] = defaults;
  if (tag === props.headers["if-none-match"]) {
    status = 304;
  } else {
    status = 200;
    body = manifest;
    headers = { ...headers, etag: tag };
  }
  return [status, headers, body];
}

// handler({ headers: {} }).then((r) => console.log(r[2].icons));
