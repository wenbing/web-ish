const publicPath = "/web-ish";

let outputPublicPath;
if (process.env.NODE_ENV === "production") {
  if (process.env.GITHUB_PAGES === "true") {
    outputPublicPath = `https://wenbing.github.io${publicPath}/`;
  } else if (process.env.FUNCTIONGRAPH === "true") {
    // outputPublicPath = `https://web-ish.obs.cn-north-4.myhuaweicloud.com${publicPath}/`;
    outputPublicPath = `${publicPath}/`;
  } else {
    outputPublicPath = `${publicPath}/`;
  }
} else {
  outputPublicPath = `${publicPath}/`;
}

module.exports = { publicPath, outputPublicPath };
