const http = require("http");
const path = require("path");
const serveHandler = require("serve-handler");
const paths = require("../server/paths.js");
const render = require("../server_lib/render.js");

const { publicDir, serverlibDir, publicPath } = paths;
const { createDoc, createError } = render;

async function handler(req, res) {
  if (req.url === "/favicon.ico") res.end();
  if (!req.url.startsWith(publicPath)) {
    throw new Error(`req.url should startsWith ${publicPath}: ${req.url}`);
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
    req.url = req.url.slice(publicPath.length);
    await serveHandler(req, res, { public: publicDir });
    return;
  }

  try {
    const doc = await createDoc({
      serverlibDir,
      publicDir,
      url: req.url,
    });
    res.writeHead(200, {
      "Content-Type": "text/html",
    });
    res.end(doc);
  } catch (ex) {
    console.error(ex);
    const doc = await createError({
      serverlibDir,
      publicDir,
      url: req.url,
    });
    res.writeHead(500, http.STATUS_CODES[500], {
      "Content-Type": "text/html",
    });
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

server.listen(8000, function () {
  console.log(`server is listening at ${JSON.stringify(this.address())}`);
});
