const path = require("path");

const webDir = path.join(__dirname, "../");
const serverDir = path.join(webDir, "server/");
const serverlibDir = path.join(__dirname, "../server_lib");

module.exports = {
  webDir,
  serverDir,
  serverlibDir,
  publicDir: (publicPath) => path.join(__dirname, "../public" + publicPath),
};
