const fs = require("fs");
const path = require("path");

const clientWebpackConfig = require("../client/webpack.config");
const serverWebpackConfig = require("./webpack.config");
const publicDir = clientWebpackConfig.output.path;
const serverDir = serverWebpackConfig.output.path;

async function writeDoc({ pathname = "/index" }) {
  const { createDoc } = require("./lib/render");
  let doc;
  try {
    doc = await createDoc({ serverDir, publicDir, pathname });
  } catch (ex) {
    console.error("writeDoc met", ex.stack);
    return;
  }
  const filepath = path.join(publicDir, pathname.slice(1) + ".html");
  try {
    fs.mkdirSync(path.dirname(filepath));
  } catch (ex) {
    if (ex.code !== "EEXIST") throw ex;
  }
  fs.writeFileSync(filepath, doc);
}

if (require.main === module) {
  const cliOpts = parseArgv();
  writeDoc({ pathname: cliOpts.pathname });
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
    if (key === "pathname") {
      val = items.pop();
    }
    if (key && val) {
      args[key] = val;
    }
  }
  return args;
}
