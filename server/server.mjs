import http from "node:http";
import path from "node:path";
import serveHandler from "serve-handler";
import clientWebpackConfig from "../client/webpack.config.js";
import serverWebpackConfig from "../server/webpack.config.js";
import pagesPublicPath from "../client/pagesPublicPath.js";
import render from "../server_lib/render.js";

const publicDir = clientWebpackConfig.output.path;
const serverDir = serverWebpackConfig.output.path;
const { createDoc } = render;

async function handler(req, res) {
  if (!req.url.startsWith(pagesPublicPath)) {
    throw new Error(`req.url should startsWith ${pagesPublicPath}: ${req.url}`);
  }
  const pathname =
    req.url.indexOf("?") === -1
      ? req.url
      : req.url.slice(0, req.url.indexOf("?"));
  const extname = path.extname(pathname);
  const isDoc =
    req.headers.accept &&
    req.headers.accept.indexOf("text/html") !== -1 &&
    (extname === "" || extname === ".html");
  if (!isDoc) {
    req.url = req.url.slice(pagesPublicPath.length);
    await serveHandler(req, res, { public: publicDir });
    return;
  }

  try {
    const doc = await createDoc({ serverDir, publicDir, url: req.url });
    res.end(doc);
  } catch (ex) {
    console.error(ex);
    const doc = await createError({ serverDir, publicDir, url: req.url });
    res.writeHead(500, http.STATUS_CODES[500]);
    res.end(doc);
  }
}

const server = http.createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);
  try {
    await handler(req, res);
  } catch (ex) {
    console.error(ex.stack);
    res.end(ex.message);
  }
});

server.listen(8080, function () {
  console.log(`server is listening at ${JSON.stringify(this.address())}`);
});
