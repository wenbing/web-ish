const path = require("path");

const publicPath = "/web-ish";
const cwd = process.cwd();
const webDir = path.join(__dirname, "../");
const serverDir = path.join(webDir, "server/");
const serverlibDir = path.join(__dirname, "../server_lib");
const publicDir = path.join(__dirname, "../public" + publicPath);

module.exports = {
  cwd,
  webDir,
  publicDir,
  serverDir,
  serverlibDir,
  publicPath,
};
