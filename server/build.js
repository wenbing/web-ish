const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const cp = require("child_process");
const { promisify } = require("util");
if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = "development";

const promisifiedWriteFile = promisify(fs.writeFile);
const clientWebpackConfig = require("../server/webpack.client.js");
const serverWebpackConfig = require("../server/webpack.server.js");
const dirs = require("../server/dirs.js");
const { webDir, serverlibDir } = dirs;

async function prebuildRoutes() {
  const { user_routes } = await import("../client/shared_routes.mjs");
  const { toSource } = await import("./routeToSource.mjs");
  const parts = user_routes;
  const partsSource = await Promise.all(parts.map(toSource));
  const routespath = path.resolve(
    __dirname,
    "../client/shared_internal_routes.js"
  );
  const source = `module.exports = [\n${partsSource.join(",\n")},\n]`;
  await writeFile(routespath, source);
}

function build() {
  const compiler = webpack([clientWebpackConfig, serverWebpackConfig]);
  return new Promise((resolve, reject) => {
    compiler.run(async (err, stats) => {
      if (err) return reject(err);
      if (stats.hasErrors()) {
        const ex = new Error(stats.toString({ colors: true }));
        return reject(ex);
      }
      resolve(stats);
    });
  });
}

function getStaticProps({ url }) {
  return {
    url,
    headers: {
      "x-forwarded-proto": "https",
      host: "wenbing.github.io",
      "user-agent": "server/build",
      "x-requested-with": undefined,
      "x-build-static": true,
    },
  };
}

async function getStaticPathnames() {
  const { pathname } = parseArgv();
  if (pathname === "all") {
    const {
      getRoutes,
      notfound,
      publicPath,
    } = require("../server_lib/render.js");
    const routes = await getRoutes();
    const pages = []
      .concat(routes, notfound)
      .filter((item) => typeof item.destination === "string")
      .map(({ destination }) => destination);
    const { getAllPosts } = await import("./post.mjs");
    const posts = (await getAllPosts()).map(({ href }) =>
      href.slice(publicPath.length)
    );
    return pages.concat(posts);
  } else {
    return [].concat.apply([], pathname);
  }
}

async function writeDocs() {
  const pathnames = await getStaticPathnames();
  if (pathnames.length === 0) return;
  async function writeDoc({ pathname }) {
    const { publicPath, createDoc } = require("../server_lib/render.js");
    const publicDir = dirs.publicDir(publicPath);
    const url = `${publicPath}${pathname}`;
    const props = getStaticProps({ url });
    const opts = { serverlibDir, publicDir };
    const doc = await createDoc(props, opts);
    const filename = pathname.endsWith("/")
      ? `${pathname}index.html`
      : pathname;
    const filepath = path.join(publicDir, filename.slice(1));
    try {
      fs.mkdirSync(path.dirname(filepath));
    } catch (ex) {
      if (ex.code !== "EEXIST") throw ex;
    }
    fs.writeFileSync(filepath, doc);
    console.log(`${path.relative(webDir, filepath)} success.`);
  }
  console.log("\nwrite docs:");
  pathnames.forEach((pathname) => writeDoc({ pathname }));
}

async function writeApis() {
  const pathnames = await getStaticPathnames();
  if (pathnames.length === 0) return;
  const { publicPath } = require("../server_lib/render.js");
  const publicDir = dirs.publicDir(publicPath);
  const { apiHandlers } = require("./handler");
  const routenames = Object.keys(apiHandlers);
  console.log("\nwrite apis:");
  const renderApi = async (routename) => {
    const url = `${publicPath}/${routename}.json`;
    const props = getStaticProps({ url });
    const contents = JSON.stringify(await apiHandlers[routename](props));
    const filepath = path.join(publicDir, url.slice(publicPath.length));
    console.log(`${path.relative(webDir, filepath)} success.`);
    return writeFile(filepath, contents);
  };
  return Promise.all(routenames.map(renderApi));
}

if (require.main === module) {
  (async function main() {
    await prebuildRoutes();
    const stats = await build();
    console.info(stats.toString({ colors: true }));
    await cpCitiesJSON();
    await writeApis();
    await writeDocs();
  })();
}

function parseArgv() {
  const items = process.argv.slice(2).reverse();
  const args = {};

  while (items.length > 0) {
    let key;
    const item = items.pop();
    if (item.startsWith("--")) {
      key = item.slice("--".length);
      const val = [];
      while (items.length > 0 && !items[items.length - 1].startsWith("--")) {
        val.push(items.pop());
      }
      if (val.length > 0) {
        args[key] = val.length === 1 ? val[0] : val;
      }
    }
  }
  return args;
}

async function cpCitiesJSON() {
  const { publicPath } = require("../server_lib/render.js");
  const publicDir = dirs.publicDir(publicPath);
  const source = path.join(webDir, "server/cities.json");
  const dest = path.join(publicDir, "cities.json");
  const cwd = process.cwd();
  const cmd = `cp ${path.relative(cwd, source)} ${path.relative(cwd, dest)}`;
  console.log(`\ncopy cities.json:\n${cmd}`);
  return cp.execSync(cmd);
}

function writeFile(filepath, contents) {
  const dirname = path.dirname(filepath);
  cp.execSync(`mkdir -p ${dirname}`);
  return promisifiedWriteFile(filepath, contents);
}
