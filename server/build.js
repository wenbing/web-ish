if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = "development";

const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const cp = require("child_process");
const { promisify } = require("util");

const promisifiedWriteFile = promisify(fs.writeFile);
const clientWebpackConfig = require("../server/webpack.client.js");
const serverWebpackConfig = require("../server/webpack.server.js");
const dirs = require("../server/dirs.js");
const parseArgv = require("./parseArgv.js");
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

async function writeDocs() {
  const { getStaticPathnames } = await import("./static.mjs");
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

async function writeManifest() {
  const { publicPath } = require("../server_lib/render.js");
  const publicDir = dirs.publicDir(publicPath);
  const filename = "manifest.webmanifest";
  const props = getStaticProps({ url: `${publicPath}/${filename}` });
  const handler = (await import("./manifest.mjs")).handler;
  const [, , body] = await handler(props);
  const contents = JSON.stringify(body);
  const filepath = path.join(publicDir, filename);
  console.log(`writeFile ${path.relative(webDir, filepath)} success.`);
  return writeFile(filepath, contents);
}

async function writeApis() {
  const { publicPath } = require("../server_lib/render.js");
  const publicDir = dirs.publicDir(publicPath);
  const { getStaticPathnames, getStaticApinames } = await import(
    "./static.mjs"
  );
  const pathnames = await getStaticPathnames();
  if (pathnames.length === 0) return;
  const apinames = getStaticApinames();
  console.log("\nwrite apis:");
  const renderApi = async ({ apiname, handler, params }) => {
    const props = getStaticProps({ url: apiname });
    const contents = JSON.stringify(await handler({ ...props, params }));
    const filepath = path.join(publicDir, apiname.slice(publicPath.length));
    console.log(`${path.relative(webDir, filepath)} success.`);
    return writeFile(filepath, contents);
  };
  return Promise.all(apinames.map(renderApi));
}

if (require.main === module) {
  (async function main() {
    // TODO build images
    // $ for file in client/images/*.jpeg; do cwebp "$file" -o "${file%.*}.webp"; done
    const { manifest } = parseArgv();
    if (manifest) {
      await writeManifest();
    } else {
      await prebuildRoutes();
      console.info((await build()).toString({ colors: true }));
      await cpCitiesJSON();
      await writeManifest();
      await writeApis();
      await writeDocs();
    }
  })();
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
