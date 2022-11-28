import path from "path";
import { stat as fspStat, readdir, readFile } from "fs/promises";
import { marked, Renderer, TextRenderer } from "marked";
import { readFileSync } from "fs";
import { intlFormat } from "date-fns";

import dirs from "./dirs.js";
import render from "../server_lib/render.js";
const { publicPath } = render;

const publicDir = dirs.publicDir(publicPath);
const postsDir = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "../posts/"
);
const replace = (t) => t.replace(/[\s-]/g, "_");
const image = (href, title, text) => {
  const statfile = path.join(
    path.dirname(new URL(import.meta.url).pathname),
    "../server_lib/stats.json"
  );
  const stats = JSON.parse(readFileSync(statfile, "utf-8"));
  const fname = (name) => name.slice(0, name.lastIndexOf("-"));
  const auxiliaryAssets = stats.namedChunkGroups.blog.auxiliaryAssets;
  const assets = auxiliaryAssets.reduce(
    (acc, { name }) => ({ ...acc, [fname(name)]: name }),
    {}
  );
  const name = text;
  const imgSrc = path.join(publicPath, assets[name]);
  const filepath = path.join(publicDir, assets[name]);
  const contents = readFileSync(filepath, "utf-8");
  const rp = /viewBox="[\d\.]+ [\d\.]+ ([\d\.]+) ([\d\.]+)"/;
  const [_, width, height] = contents.match(rp);
  const w = `width="${width}"`;
  return `<img src="${imgSrc}" title="${title || text}" alt="${text}" ${w}/>`;
};
const renderer = { image };
marked.use({ renderer });

// https://marked.js.org/using_pro#renderer
const splitReduce = (s, f) =>
  s.split(", ").reduce((a, k) => ({ ...a, [k]: f.bind({ name: k }) }), {});
const ones = splitReduce(
  "code, blockquote, html, list, listitem, paragraph, tablerow, tablecell, strong, em, codespan, del, text",
  (text) => `${text}`
);
const nulls = splitReduce("hr, checkbox, br", () => "");
const pairs = splitReduce("table", (t1, t2) => [t1, t2].join("。"));
const lasts = splitReduce("link, image", function (href, title, text) {
  return `${this.name}[${text}]；`;
});
const abstractRenderer = { ...lasts, ...pairs, ...ones, ...nulls };
abstractRenderer.heading = (text, level) => {
  if (level === 1) return "";
  return `${text}：`;
};

export async function getCurrentPost({ name }) {
  const posts = (await readdir(postsDir)).filter(
    (item) => path.extname(item) === ".md"
  );
  if (!name) {
    return null;
  }
  const found = posts.filter((item) => {
    const filename = replace(path.basename(item, path.extname(item)));
    return filename === name;
  });
  if (found.length === 0) {
    return null;
  }
  const current = found[0];
  let contents = await readFile(path.join(postsDir, current), "utf8");

  contents = marked.parse(contents, { headerIds: true });
  return { contents };
}

export async function getAllPosts() {
  const dtOpts = {
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false,
    minute: "numeric",
    timeZone: "Asia/Shanghai",
  };
  let posts = (await readdir(postsDir))
    .filter((item) => path.extname(item) === ".md")
    .map(async (item) => {
      const name = replace(path.basename(item, path.extname(item)));
      const href = publicPath + "/post/" + name + ".html";
      const fp = path.join(postsDir, item);
      const stat = await fspStat(fp);
      let publishTime = new Date(parseInt(stat.mtimeMs, 10));
      publishTime = intlFormat(publishTime, dtOpts, { locale: "zh-hans" });
      const contents = await readFile(fp, "utf8");
      // 200 indexOf
      const reg = /\n/g;
      let matched;
      do {
        matched = reg.exec(contents);
      } while (matched && matched.index < 100);
      const pos = matched ? matched.index : contents.length;
      let beginner = contents.slice(0, pos);
      let title = "";
      const walkTokens = (token) => {
        if (token.type === "heading" && token.depth === 1) {
          title = token.text;
        }
      };
      const markedOpts = {
        headerIds: true,
        walkTokens,
        renderer: abstractRenderer,
      };
      beginner = marked.parse(beginner, markedOpts);
      beginner = beginner.replace(/[。；]$/, "");
      beginner = beginner + "…";
      return { name, href, publishTime, title, beginner };
    });
  return await Promise.all(posts);
}

export async function handler(props) {
  const name = props.params.name;
  return getCurrentPost({ name });
}
