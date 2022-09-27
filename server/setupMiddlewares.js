const path = require("path");
const http = require("http");
const webpack = require("webpack");
const clearRequireCache = require("clear-require-cache");

const serverWebpackConfig = require("../server/webpack.config");

const setupMiddlewares = (middlewares, devServer) => {
  const middlewareName = "render middleware";
  const logger = devServer.compiler.getInfrastructureLogger(middlewareName);
  const clientCompiler = devServer.compiler;
  const outputFileSystem = clientCompiler.outputFileSystem;
  const publicDir = clientCompiler.outputPath;
  const serverCompiler = webpack(serverWebpackConfig);
  const serverDir = serverCompiler.outputPath;

  let serverCompilerInvalid = null;
  serverCompiler.hooks.invalid.tap(middlewareName, (filename, changeTime) => {
    if (filename.endsWith("server-entry.js"))
      serverCompilerInvalid = path.relative(clientCompiler.context, filename);
  });
  serverCompiler.watch({}, function handleWatchRun(err, stats) {
    if (err) throw err; // 1)what occurred?
    logger.info("server compiler start");
    console.log(stats.toString({ chunks: false, colors: true }));
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
    const pathname = req.url;
    const extname = path.extname(pathname);

    const isDoc =
      req.headers.accept &&
      req.headers.accept.indexOf("text/html") !== -1 &&
      (extname === "" || extname === ".html");
    if (!isDoc) {
      return next();
    }
    logger.info(req.method, req.url);
    const renderPath = require.resolve(`${serverDir}/render`);
    clearRequireCache(renderPath);
    const { createDoc, createError } = require(renderPath);
    const opts = { serverDir, publicDir, pathname, fs: outputFileSystem };
    try {
      const doc = await createDoc(opts);
      res.end(doc);
    } catch (ex) {
      const exDoc = await createError(Object.assign({}, opts, { error: ex }));
      res.writeHead(500, http.STATUS_CODES[500]);
      res.end(exDoc);
    }
  };
  middlewares.push({ name: middlewareName, middleware });
  return middlewares;
};

module.exports = setupMiddlewares;
