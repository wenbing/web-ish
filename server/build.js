const fs = require("fs");
const path = require("path");
const webpack = require("webpack");
const cp = require("child_process");

const clientWebpackConfig = require("../client/webpack.config.js");
const serverWebpackConfig = require("./webpack.config.js");
const { publicPath } = require("../client/paths.js");
const dirs = require("../server/dirs.js");
const { webDir, serverlibDir } = dirs;
const publicDir = dirs.publicDir(publicPath);

async function writeDoc({ pathname }) {
  const { createDoc } = require("../server_lib/render.js");
  const url = `${publicPath}${pathname}`;
  const initials = {
    url,
    isStatic: true,
    headers: {
      ["x-forwarded-proto"]: "http",
      "x-requested-with": "",
      "user-agent": "",
    },
  };
  const opts = { serverlibDir, publicDir };
  const doc = await createDoc(initials, opts);
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
  const source = path.join(webDir, "server/cities.json");
  const dest = path.join(publicDir, "cities.json");
  const cmd = `cp ${source} ${dest}`;
  console.log(cmd);
  return cp.execSync(cmd);
}
