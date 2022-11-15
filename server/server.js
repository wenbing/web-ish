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
  } catch (error) {
    logger.error(error.stack);
    safeRespond(req, res, { is, error });
  }
});

const port = process.env.NODE_ENV === "production" ? 8000 : 80;
server.listen(port, function () {
  console.log(`server is listening at ${JSON.stringify(this.address())}`);
});

function safeRespond(req, res, { is, error }) {
  const statusCode = error.statusCode || 500;
  const contentType = is.doc ? "text/html" : "application/json";
  const headers = { "Content-Type": contentType };
  const statusMessage = http.STATUS_CODES[statusCode];
  if (!res.headersSent) res.writeHead(statusCode, statusMessage, headers);
  const body = is.doc
    ? error.message
    : JSON.stringify({ code: error.code || -1, message: error.message });
  if (!res.writableEnded) res.end(body);
}
