const path = require("path");

const cwd = process.cwd();
const publicPath = "/web-ish";
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
