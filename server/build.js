const fs = require("fs");
const path = require("path");
const webpack = require("webpack");

const writeCities = require("./cityInfo");
const clientWebpackConfig = require("../client/webpack.config");
const serverWebpackConfig = require("./webpack.config");
const publicDir = clientWebpackConfig.output.path;
const serverDir = serverWebpackConfig.output.path;
const pagesPublicPath = require("../client/pagesPublicPath");

async function writeDoc({ pathname }) {
  const { createDoc } = require("./lib/render");
  let doc;
  try {
    doc = await createDoc({
      serverDir,
      publicDir,
      pathname: `${pagesPublicPath}${pathname}`,
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
  console.log(`fs.write public${filename} success.`);
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
    writeCities();
    const cliOpts = parseArgv();
    (cliOpts.pathname || ["/"]).forEach((pathname) => {
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
