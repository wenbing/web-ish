const fs = require("fs");
const { readFile, writeFile } = require("fs/promises");
const path = require("path");
const http = require("http");
const webpack = require("webpack");
const { v4: uuidv4 } = require("uuid");
const clearRequireCache = require("clear-require-cache");
const webpackServerConfig = require("../server/webpack.server");
const dirs = require("./dirs");
const { webDir } = dirs;

const setupMiddlewares = (middlewares, devServer) => {
  const mwName = "render middleware";
  const compilers = [devServer.compiler, webpack(webpackServerConfig)];
  const [clientCompiler, serverCompiler] = compilers;
  const logger = clientCompiler.getInfrastructureLogger(mwName);
  const outputFileSystem = clientCompiler.outputFileSystem;

  let serverCompilerInvalid = null;
  const hookInvalid = (filename) => {
    if (filename.endsWith("server-entry.tsx")) {
      serverCompilerInvalid = path.relative(clientCompiler.context, filename);
      logger.info(`server compiler invalid tapped, ${serverCompilerInvalid}`);
    }
  };
  const hookDone = (stats) => {
    logWebpackServer({ logger, stats });
    if (serverCompilerInvalid) {
      const clients = devServer.webSocketServer.clients;
      devServer.sendMessage(clients, "static-changed", serverCompilerInvalid);
      serverCompilerInvalid = null;
    }
  };
  serverCompiler.hooks.invalid.tap(mwName, hookInvalid);
  serverCompiler.hooks.done.tap(mwName, hookDone);

  clearRoutes();
  serverCompiler.watch({}, () => {});

  const middleware = async (req, res, next) => {
    const reqid = uuidv4();

    logger.info(req.method, req.url);
    const logNext = () => {
      const r = next();
      logger.info(`${req.method} ${req.url} ${res.statusCode}`);
      return r;
    };

    const { publicPath } = await import(`../client/shared_routes.mjs`);
    if (!req.url.startsWith(publicPath)) {
      return logNext();
    }

    const handlerPath = require.resolve("./handler");
    clearRequireCache(handlerPath);

    const { isDoc, isApi } = require(handlerPath);
    const is = { doc: isDoc(req), api: isApi(req, res) };
    if (!(is.doc || is.api)) {
      return logNext();
    }

    if (checkFile(req, res, { publicPath, fs: outputFileSystem })) {
      // `There is already a file, '${mwName}' will not process.`
      return logNext();
    }

    if (is.doc) {
      logger.info("    " + JSON.stringify({ "x-request-id": reqid }));
      await writeRoutes({ url: req.url, id: reqid, compilers });
      clearRequireCache(handlerPath);
    }

    let statusCode;
    let headers;
    let body;
    try {
      const { reqHandler } = require(handlerPath);
      const opts = { logger, fs: outputFileSystem };
      const result = await reqHandler(req, res, opts);
      if (result === undefined) {
        logger.info(`${req.method} ${req.url} ${res.statusCode}`);
        return;
      }
      [statusCode, headers, body] = processResult(req, res, { is, result });
    } catch (error) {
      logger.error(`req handler throws ${error.stack}`);
      [statusCode, headers, body] = processError({ is, error });
    }
    const type = is.api ? "application/json" : "text/html";
    const defaultHeaders = { "content-type": `${type}; charset=utf-8` };
    headers = { ...defaultHeaders, ...headers };
    const statusMessage = http.STATUS_CODES[statusCode];
    res.writeHead(statusCode, statusMessage, headers);
    res.end(body);
    logger.info(`${req.method} ${req.url} ${statusCode}`);
  };
  middlewares.unshift({ name: mwName, middleware });
  return middlewares;
};

module.exports = setupMiddlewares;

function processResult(req, res, { is, result }) {
  let statusCode;
  let headers;
  let body;
  if (typeof result === "string") {
    [statusCode, headers, body] = [200, null, result];
  } else if (Array.isArray(result)) {
    [statusCode, headers, body] = result;
  } else {
    const ex = new Error(`unspport result: ${result}`);
    ex.statusCode = 501;
    [statusCode, headers, body] = processError({ is, error: ex });
  }
  return [statusCode, headers, body];
}

function processError({ is, error }) {
  const statusCode = error.statusCode || 500;
  const body = is.api
    ? JSON.stringify({ code: error.code || -1, message: error.message })
    : error.message;
  return [statusCode, null, body];
}

function logWebpackServer({ logger, stats }) {
  logger.info("server compiler start");
  logger.info(stats.toString({ chunks: false, colors: true }));
  logger.info("server compiler end");
}

function clearRoutes() {
  const internalRoutesPath = path.resolve(
    __dirname,
    "../client/shared_internal_routes.js"
  );
  const source = `module.exports = []`;
  fs.writeFileSync(internalRoutesPath, source);
}

async function writeRoutes({ url, id, compilers }) {
  const { _match, user_routes, _notfound, publicPath, routeSourceToRegexp } =
    await import(`../client/shared_routes.mjs?id=${id}`);
  const result = _match(url, {
    publicPath,
    routes: user_routes.map(routeSourceToRegexp),
    notfound: routeSourceToRegexp(_notfound),
  });
  if (result.destination === null) {
    return;
  }
  // relfile to ./client directory
  const clientpath = path.join(webDir, "./client");
  const relfile = path.join(clientpath, result.Component[0]);
  const parts = user_routes.filter(
    ({ Component }) => relfile === path.join(clientpath, Component[0])
  );
  const internalRoutesPath = path.resolve(
    __dirname,
    "../client/shared_internal_routes.js"
  );
  const { toSource } = await import("./routeToSource.mjs");
  const partsSource = await Promise.all(parts.map(toSource));
  const source = `module.exports = [\n${partsSource.join(",\n")},\n]`;
  const contents = await readFile(internalRoutesPath, "utf8");
  if (contents === source) {
    return;
  }
  const write = writeFile(internalRoutesPath, source);
  const hooks = (compiler) =>
    new Promise((resolve, reject) => {
      compiler.hooks.done.tap("write routes", (/* stats */) => resolve(null));
      compiler.hooks.failed.tap("write routes", (err) => reject(err));
    });
  await Promise.all(compilers.map(hooks).concat(write));
}

function checkFile(req, res, { fs, publicPath }) {
  const [publicDir, url] = [dirs.publicDir(publicPath), req.url];
  const pos = url.indexOf("?");
  const [fstart, fend] = [publicPath.length, pos === -1 ? url.length : pos];
  let fpath = url.slice(fstart, fend);
  if (fpath === "/" || fpath === "") return false;
  fpath = path.join(publicDir, fpath);
  try {
    fs.accessSync(fpath, fs.constants.F_OK);
    return true;
  } catch (ex) {
    return false;
  }
}
