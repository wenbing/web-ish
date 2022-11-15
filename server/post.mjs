import path from "path";
import { readdir, readFile } from "fs/promises";
import { marked } from "marked";

const postsDir = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  "../posts/"
);

export async function getAllPosts() {
  const { publicPath } = (await import("../server_lib/render.js")).default;
  const replace = (t) => t.replace(/[\s-]/g, "_");
  const posts = (await readdir(postsDir)).map(async (item) => {
    const title = replace(path.basename(item, path.extname(item)));
    const href = publicPath + "/post/" + title + ".html";
    let contents = await readFile(path.join(postsDir, item), "utf8");
    contents = marked.parse(contents);
    return { title, href, contents };
  });
  return await Promise.all(posts);
}
