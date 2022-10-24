const path = require("path");

const cwd = process.cwd();
const webDir = path.join(__dirname, "../");
const serverDir = path.join(webDir, "server/");
const serverlibDir = path.join(__dirname, "../server_lib");

module.exports = {
  cwd,
  webDir,
  serverDir,
  serverlibDir,
  publicDir: (publicPath) => path.join(__dirname, "../public" + publicPath),
};
