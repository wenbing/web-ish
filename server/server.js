const http = require("http");
const { promisify } = require("util");
const compression = require("compression");

const compress = promisify(compression());
const render = require("../server_lib/render.js");
const { isDoc, isApi, reqHandler } = require("./handler.js");

const server = http.createServer(async (req, res) => {
  const logger = console;
  logger.log(`${req.method} ${req.url}`);
  if (process.env.NODE_ENV === "production") {
    await compress(req, res);
  }
  if (req.url === "/favicon.ico") {
    res.end();
    return;
  }
  const { publicPath } = render;
  const is = { doc: isDoc(req), api: isApi(req, res, { publicPath }) };
  try {
    await reqHandler(req, res, { render, logger });
  } catch (ex) {
    logger.error(ex.stack);
    res.setHeader("Content-Type", is.doc ? "text/html" : "application/json");
    const statusCode = ex.statusCode || 500;
    res.writeHead(statusCode, http.STATUS_CODES[statusCode]);
    const body = is.doc
      ? ex.message
      : JSON.stringify({ code: ex.code || -1, message: ex.message });
    res.end(body);
  }
});

const port = process.env.NODE_ENV === "production" ? 8000 : 80;
server.listen(port, function () {
  console.log(`server is listening at ${JSON.stringify(this.address())}`);
});
