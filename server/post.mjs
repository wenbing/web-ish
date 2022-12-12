import path from "path";
import { stat as fspStat, readdir, readFile } from "fs/promises";
import { marked, Renderer, TextRenderer } from "marked";
import { promisify } from "util";
import { readFileSync } from "fs";
import { intlFormat } from "date-fns";
import imageSize from "image-size";

import dirs from "./dirs.js";
import render from "../server_lib/render.js";

const { publicPath } = render;
const publicDir = dirs.publicDir(publicPath);
const postsDir = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "../posts/"
);
const replaceName = (t) => t.replace(/[\s-]/g, "_");
const getBlogAssets = () => {
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
  return assets;
};
const getImageSize = (relpath) => {
  const extname = path.extname(relpath);
  switch (extname) {
    case ".svg":
    case ".webp": {
      const filepath = path.join(publicDir, relpath);
      return imageSize(filepath);
    }
    default:
      return null;
  }
};
const imageRenderer = (href, title, text) => {
  const assets = getBlogAssets();
  const name = text;
  const id = name;
  const defaultSrc = (ratio, fill = "rgb(0 0 0 / 10%)") =>
    "data:image/svg+xml," +
    encodeURIComponent(
      `
<svg viewBox="0 0 100 ${100 / ratio}" xmlns="http://www.w3.org/2000/svg">
  <rect x="0" y="0" width="100" height="${100 / ratio}" fill="${fill}" />
</svg>
  `.trim()
    );

  const imgSrc = path.join(publicPath, assets[name]);
  const extname = path.extname(imgSrc);
  const size = getImageSize(assets[name]);
  let istyle;
  let style;
  let iwidth;
  let iheight;
  let ratio = size.width / size.height;
  if (ratio > 1) {
    iwidth = 590;
    iheight = (iwidth / ratio).toFixed(2);
  } else {
    iheight = 590;
    iwidth = (iheight * ratio).toFixed(2);
  }
  ratio = ratio.toFixed(2);
  istyle = `style="width:${iwidth}px; height:${iheight}px; max-width: calc(100vw - 10px); max-height: calc(calc(100vw - 10px) / ${ratio})"`;
  style = `width="${size.width}px" height="${size.height}px"`;
  const t = title || text;
  return [
    `<div class="blog-article__image" ${istyle} data-ratio=${ratio}>`,
    `  <img id="${id}" class="image--lazy" src="${defaultSrc(
      ratio
    )}" data-src="${imgSrc}" title="${t}" alt="${text}" ${style} />`,
    `</div>`,
    `<span class="blog-article__imagetitle">${name}</span>`,
  ].join("");
};
const listRenderer = (body, ordered, start) => {
  return `<ul class="blog-article__list">${body}</ul>`;
};
const renderer = { image: imageRenderer, list: listRenderer };
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
    const filename = replaceName(path.basename(item, path.extname(item)));
    return filename === name;
  });
  if (found.length === 0) {
    return null;
  }
  const current = found[0];
  let contents = await readFile(path.join(postsDir, current), "utf8");

  const images = [];
  const assets = getBlogAssets();
  const walkTokens = (token) => {
    if (token.type === "image") {
      const name = token.text;
      const id = name;
      const href = path.join(publicPath, assets[name]);
      const size = getImageSize(assets[name]);
      images.push({ id, href, ...size });
    }
  };
  contents = marked.parse(contents, { headerIds: true, walkTokens });

  return { contents, images };
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
      const name = replaceName(path.basename(item, path.extname(item)));
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
