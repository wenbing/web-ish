const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const cp = require("child_process");

const clientWebpackConfig = require("../client/webpack.config");
const serverWebpackConfig = require("./webpack.config");
const { publicPath } = require("../client/paths.js");
const dirs = require("../server/dirs.js");
const { cwd, webDir, serverlibDir } = dirs;
const publicDir = dirs.publicDir(publicPath);

async function writeDoc({ pathname }) {
  const { createDoc } = require("../server_lib/render");
  let doc;
  try {
    doc = await createDoc({
      serverlibDir,
      publicDir,
      url: `${publicPath}${pathname}`,
      isStatic: true,
    });
  } catch (ex) {
    console.error("writeDoc met", ex.stack);
    return;
  }
  const filename = pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const filepath = path.join(publicDir, filename.slice(1));
  try {
    fs.mkdirSync(path.dirname(filepath));
  } catch (ex) {
    if (ex.code !== "EEXIST") throw ex;
  }
  fs.writeFileSync(filepath, doc);
  console.log(`fs.write ${path.relative(webDir, filepath)} success.`);
}

if (require.main === module) {
  // const cliOpts = parseArgv();
  // (cliOpts.pathname || ["/"]).forEach((pathname) => {
  //   writeDoc({ pathname });
  // });
  // return;

  const compiler = webpack([clientWebpackConfig, serverWebpackConfig]);
  compiler.run((err, stats) => {
    if (err) throw err;
    if (stats.hasErrors()) throw new Error(stats.toString({ colors: true }));
    console.log(stats.toString({ colors: true }));
    cpCitiesJSON();
    const cliOpts = parseArgv();
    (cliOpts.pathname || []).forEach((pathname) => {
      writeDoc({ pathname });
    });
  });
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
      args[key] = val;
    }
  }
  return args;
}

function cpCitiesJSON() {
  const cmd = `cp ${path.relative(
    cwd,
    path.join(webDir, "server/cities.json")
  )} ${path.relative(cwd, path.join(publicDir, "cities.json"))}`;
  console.log(cmd);
  cp.execSync(cmd);
}
