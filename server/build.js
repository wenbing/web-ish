const fs = require("fs");
const path = require("path");
const webpack = require("webpack");

const writeCities = require("./cityInfo");
const clientWebpackConfig = require("../client/webpack.config");
const serverWebpackConfig = require("./webpack.config");
const publicDir = clientWebpackConfig.output.path;
const serverDir = serverWebpackConfig.output.path;

async function writeDoc({ pathname = "/index.html" }) {
  const { createDoc } = require("./lib/render");
  let doc;
  try {
    doc = await createDoc({ serverDir, publicDir, pathname });
  } catch (ex) {
    console.error("writeDoc met", ex.stack);
    return;
  }
  const filename = pathname === "/" ? "/index.html" : pathname;
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
  const compiler = webpack([clientWebpackConfig, serverWebpackConfig]);
  compiler.run((err, stats) => {
    if (err) throw err;
    if (stats.hasErrors()) throw new Error(stats.toString({ colors: true }));
    console.log(stats.toString({ colors: true }));
    writeCities();
    const cliOpts = parseArgv();
    cliOpts.pathname.forEach((pathname) => {
      writeDoc({ pathname });
    });
  });
}

function parseArgv() {
  const items = process.argv.slice(2).reverse();
  const args = {};
  let key;
  let val;
  while ((key = items.pop())) {
    if (key.startsWith("--")) {
      key = key.slice("--".length);
    }
    const vals = [];
    if (key === "pathname") {
      while (items.length > 0 && !items[items.length - 1].startsWith("--")) {
        vals.push(items.pop());
      }
    }
    if (key && vals.length > 0) {
      args[key] = vals;
    }
  }
  return args;
}
