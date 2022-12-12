if (process.env.NODE_ENV === undefined) process.env.NODE_ENV = "development";

const { readFileSync } = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");
const { promisify } = require("util");
const compression = require("compression");

const compress = promisify(compression());
const render = require("../server_lib/render.js");
const { isDoc, isApi, reqHandler } = require("./handler.js");
const logger = console;

async function main(req, res) {
  logger.info(`[request ] ${req.method} ${req.url}`);
  if (process.env.NODE_ENV === "production") {
    await compress(req, res);
  }
  if (req.url === "/favicon.ico") {
    res.end();
    return;
  }
  const { publicPath } = render;
  const is = { doc: isDoc(req), api: isApi(req, res, { publicPath }) };
  const type = is.api ? "application/json" : "text/html";
  const defaultHeaders = { "content-type": `${type}; charset=utf-8` };
  let [statusCode, headers, body] = [200, {}, "OK"];
  try {
    const result = await reqHandler(req, res, { render, logger });
    if (result === undefined) {
      statusCode = res.statusCode;
      logger.info(`[response] ${req.method} ${req.url} ${statusCode}`);
      return;
    }
    if (typeof result === "string") {
      [statusCode, headers, body] = [200, {}, result];
    } else if (Array.isArray(result)) {
      [statusCode, headers, body] = result;
    } else {
      const ex = new Error(`[server main] unspport result: ${result}`);
      ex.statusCode = 501;
      throw ex;
    }
  } catch (error) {
    logger.error(`[server main] req handler throws ${error.stack}`);
    statusCode = error.statusCode || 500;
    body = is.api
      ? JSON.stringify({ code: error.code || -1, message: error.message })
      : error.message;
  }
  headers = { ...defaultHeaders, ...headers };
  const statusMessage = http.STATUS_CODES[statusCode];
  res.writeHead(statusCode, statusMessage, headers);
  res.end(body);
  logger.info(`[response] ${req.method} ${req.url} ${statusCode}`);
}

function onlisten() {
  console.log(`server is listening at ${JSON.stringify(this.address())}`);
}

const server = http.createServer(main);
const port = process.env.NODE_ENV === "production" ? 8000 : 80;
server.listen(port, onlisten);

if (process.env.NODE_ENV === "development") {
  const options = {
    key: readPem(".webpack/local.zhengwenbing.com-key.pem"),
    cert: readPem(".webpack/local.zhengwenbing.com.pem"),
  };
  const sserver = https.createServer(options, main);
  sserver.listen(443, onlisten);
}

function readPem(filename) {
  return readFileSync(path.join(__dirname, "../", filename));
}
