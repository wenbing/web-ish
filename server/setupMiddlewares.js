const fs = require("fs");
const path = require("path");
const http = require("http");
const { promisify } = require("util");
const webpack = require("webpack");
const clearRequireCache = require("clear-require-cache");
const { v4: uuidv4 } = require("uuid");

const middlewareName = "render middleware";
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const webpackServerConfig = require("../server/webpack.server");
const serverCompiler = webpack(webpackServerConfig);
const dirs = require("./dirs");
const { webDir } = dirs;

function logWebpackServer({ logger, stats }) {
  logger.info("server compiler start");
  console.info(stats.toString({ chunks: false, colors: true }));
  logger.info("server compiler end");
}

function importRoutes(id) {
  return import(`../client/shared_routes.mjs?id=${id}`);
}

function clearRoutes() {
  const routespath = path.resolve(
    __dirname,
    "../client/shared_internal_routes.js"
  );
  const source = `module.exports = []`;
  fs.writeFileSync(routespath, source);
}

const setupMiddlewares = (middlewares, devServer) => {
  const clientCompiler = devServer.compiler;
  const logger = clientCompiler.getInfrastructureLogger(middlewareName);
  const outputFileSystem = clientCompiler.outputFileSystem;

  let serverCompilerInvalid = null;
  serverCompiler.hooks.invalid.tap(middlewareName, (filename) => {
    if (filename.endsWith("server-entry.tsx"))
      serverCompilerInvalid = path.relative(clientCompiler.context, filename);
  });
  serverCompiler.watch({}, (err, stats) => {
    logWebpackServer({ logger, stats });
    if (err) throw err; // 1)what occurred?
    if (serverCompilerInvalid) {
      const clients = devServer.webSocketServer.clients;
      devServer.sendMessage(clients, "static-changed", serverCompilerInvalid);
      serverCompilerInvalid = null;
    }
  });

  clearRoutes();

  const middleware = async (req, res, next) => {
    const reqId = uuidv4();
    logger.info(req.method, req.url);
    const handlerPath = require.resolve("./handler");
    clearRequireCache(handlerPath);

    const { publicPath } = await importRoutes(reqId);
    if (!req.url.startsWith(publicPath)) {
      return next();
    }

    const { isDoc, isApi } = require(handlerPath);
    const is = { doc: isDoc(req), api: isApi(req, res) };
    if (!(is.doc || is.api)) {
      return next();
    }

    if (checkFile(req, res, { publicPath, fs: outputFileSystem })) {
      console.log(`There is a file, '${middlewareName}' will not process.`);
      return next();
    }

    if (isDoc) {
      const compilers = [clientCompiler, serverCompiler];
      await writeRoutes({ url: req.url, reqId, compilers });
      clearRequireCache(handlerPath);
    }

    const { reqHandler } = require(handlerPath);
    try {
      await reqHandler(req, res, { logger, fs: outputFileSystem });
    } catch (error) {
      logger.error(error.stack);
      safeRespond(req, res, { is, error });
    }
  };
  middlewares.unshift({ name: middlewareName, middleware });
  return middlewares;
};

module.exports = setupMiddlewares;

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

async function writeRoutes({ url, reqId, compilers }) {
  const { _match, user_routes, _notfound, publicPath, routeSourceToRegexp } =
    await importRoutes(reqId);
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
  const routespath = path.resolve(
    __dirname,
    "../client/shared_internal_routes.js"
  );
  const { toSource } = await import("./routeToSource.mjs");
  const partsSource = await Promise.all(parts.map(toSource));
  const source = `module.exports = [\n${partsSource.join(",\n")},\n]`;
  const contents = await readFile(routespath, "utf8");
  if (contents === source) {
    return;
  }
  const done = compilers.map(
    (compiler) =>
      new Promise((resolve) =>
        compiler.hooks.done.tap("write routes", () => resolve(null))
      )
  );
  const write = writeFile(routespath, source);
  const promises = done.concat(write);
  await Promise.all(promises);
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
