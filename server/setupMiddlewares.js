const path = require("path");
const http = require("http");
const webpack = require("webpack");
const clearRequireCache = require("clear-require-cache");

const serverWebpackConfig = require("../server/webpack.server");

const setupMiddlewares = (middlewares, devServer) => {
  const middlewareName = "render middleware";
  const logger = devServer.compiler.getInfrastructureLogger(middlewareName);
  const clientCompiler = devServer.compiler;
  const outputFileSystem = clientCompiler.outputFileSystem;
  // const publicDir = clientCompiler.outputPath;
  const serverCompiler = webpack(serverWebpackConfig);
  const serverlibDir = serverCompiler.outputPath;

  let serverCompilerInvalid = null;
  serverCompiler.hooks.invalid.tap(
    middlewareName,
    (filename /*, changeTime*/) => {
      if (filename.endsWith("server-entry.tsx"))
        serverCompilerInvalid = path.relative(clientCompiler.context, filename);
    }
  );
  serverCompiler.watch({}, function handleWatchRun(err, stats) {
    if (err) throw err; // 1)what occurred?
    logger.info("server compiler start");
    logger.info(stats.toString({ chunks: false, colors: true }));
    logger.info("server compiler end");
    if (serverCompilerInvalid) {
      devServer.sendMessage(
        devServer.webSocketServer.clients,
        "static-changed",
        serverCompilerInvalid
      );
      serverCompilerInvalid = null;
    }
  });

  const middleware = async (req, res, next) => {
    logger.info(req.method, req.url);
    const renderPath = require.resolve(`${serverlibDir}/render`);
    const handlerPath = require.resolve("./handler");
    clearRequireCache(handlerPath);
    clearRequireCache(renderPath);

    const render = require(renderPath);
    const { publicPath } = render;
    if (!req.url.startsWith(publicPath)) {
      return next();
    }
    const handlers = require(handlerPath);
    const { isDoc, isApi, reqHandler } = handlers;
    const is = { doc: isDoc(req), api: isApi(req, res, { publicPath }) };
    if (!(is.doc || is.api)) {
      return next();
    }
    try {
      await reqHandler(req, res, { render, logger, fs: outputFileSystem });
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
  };
  middlewares.unshift({ name: middlewareName, middleware });
  return middlewares;
};

module.exports = setupMiddlewares;
