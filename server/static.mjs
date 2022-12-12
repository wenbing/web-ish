import { v1 as uuidv1 } from "uuid";

import parseArgv from "./parseArgv.js";

export async function getStaticPathnames(opts) {
  const id = process.env.NODE_ENV === "development" ? uuidv1() : "";
  const { default: render } = await import(`../server_lib/render.js?id=${id}`);
  const { getRoutes, notfound, publicPath } = render;
  opts || (opts = parseArgv());
  if (opts.pathname === "all") {
    const routes = await getRoutes();
    const pages = []
      .concat(routes, notfound)
      .filter((item) => typeof item.destination === "string")
      .map(({ destination }) => destination);
    const { getAllPosts } = await import(`./post.mjs?id=${id}`);
    const posts = (await getAllPosts()).map(({ href }) =>
      href.slice(publicPath.length)
    );
    return pages.concat(posts);
  } else {
    return [].concat.apply([], opts.pathname);
  }
}

// getStaticPathnames({ pathname: "all" }).then((r) => console.log(r));

export async function getStaticApinames() {
  const id = process.env.NODE_ENV === "development" ? uuidv1() : "";
  const { apiRoutes } = await import(`./handler.js?id=${id}`);
  const apinames = (await Promise.all(apiRoutes)).reduce(
    (acc, { source, toPath, handler, keys, values }) => {
      if (keys.length === 0) return [...acc, { apiname: source, handler }];
      if (keys.length > 1) {
        throw new Error(`unsupported route keys.length: ${keys.length}`);
      }
      const [key, vals] = Object.entries(values)[0];
      const paths = vals.map((val) => {
        const params = { [key]: val };
        const apiname = toPath(params);
        return { apiname, handler, params };
      });
      return [...acc, ...paths];
    },
    []
  );
  return apinames;
}

// getStaticApinames().then((r) => console.log(r));
