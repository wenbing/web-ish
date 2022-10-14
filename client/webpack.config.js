const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const StatsWriterPlugin = require("../server/StatsWriterPlugin");
const setupMiddlewares = require("../server/setupMiddlewares");
const mode =
  process.env.NODE_ENV === "production" ? "production" : "development";
const cwd = process.cwd();
const pagesPublicPath = require("./pagesPublicPath");
const webDir = path.join(__dirname, "../");
const publicDir = path.join(__dirname, "../public", pagesPublicPath.slice(1));
const serverlibDir = path.join(__dirname, "../server_lib");

const jsRule = [
  {
    test: /\.m?js$/,
    exclude: /node_modules/,
    use: {
      loader: "babel-loader",
      options: {
        presets: [
          ["@babel/preset-env", { targets: "> 0.25%, not dead" }],
          ["@babel/preset-react", { runtime: "automatic" }],
          ["@babel/preset-typescript", { allExtensions: true, isTSX: true }],
        ],
      },
    },
  },
];
const cssRule = [
  {
    test: /\.css$/i,
    use: [{ loader: MiniCssExtractPlugin.loader, options: {} }, "css-loader"],
  },
];
const assetRule = [
  {
    test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/i,
    type: "asset",
  },
];
const entry = {
  client:
    "./" + path.relative(cwd, path.resolve(__dirname, "./client-entry.js")),
  error: "./" + path.relative(cwd, path.resolve(__dirname, "./error-entry.js")),
};
const output = {
  path: publicDir,
  publicPath:
    process.env.GITHUB_PAGES === "true"
      ? `https://wenbing.github.io${pagesPublicPath}/`
      : `${pagesPublicPath}/`,
  filename: "[name].js",
  chunkFilename: "[name].js",
};
const miniCssOpts = { filename: "[name].css", chunkFilename: "[name].css" };
if (mode === "production") {
  Object.assign(output, {
    filename: "[name].[contenthash].js",
    chunkFilename: "[name].[contenthash].js",
  });
  Object.assign(miniCssOpts, {
    filename: "[name].[contenthash].css",
    chunkFilename: "[name].[contenthash].css",
  });
}
const target = "web";
const client = {
  mode,
  entry,
  output,
  target,
  module: { rules: jsRule.concat(cssRule).concat(assetRule) },
  resolve: {
    fallback: {
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
    },
  },
  externals,
  plugins: [
    new webpack.ProvidePlugin({
      // buffer: require.resolve('buffer'),
      process: require.resolve("process/browser"),
    }),
    new StatsWriterPlugin({ outputPath: serverlibDir }),
    new MiniCssExtractPlugin(miniCssOpts),
    new webpack.DefinePlugin({
      "process.env.BUILD_TARGET": JSON.stringify(target),
    }),
  ],
  stats: { logging: "info" },
};
if (mode === "development") {
  client.devtool = "eval-source-map";
  client.devServer = {
    hot: true,
    port: 3000,
    setupMiddlewares,
    static: { directory: publicDir, publicPath: pagesPublicPath },
    devMiddleware: { publicPath: pagesPublicPath },
  };
} else if (mode === "production") {
  client.optimization = {
    moduleIds: "deterministic",
    splitChunks: {
      cacheGroups: {
        ["react-dom"]: {
          test: /[\\/]node_modules[\\/]react-dom[\\/]/,
          name: "react-dom",
          chunks: "all",
        },
      },
    },
    minimizer: ["...", new CssMinimizerPlugin()],
  };
}

module.exports = client;

if (require.main === module) {
  console.log(module.exports);
}

function externals(o, cb) {
  // o.request startsWith: / ./ ../ \w+|@, aka. filepath or modulename
  if (o.request.startsWith("/") || o.request.startsWith(".")) {
    const r = path.resolve(o.context, o.request);
    const isServerModules = path.relative(webDir, r).startsWith("server/");
    if (isServerModules) {
      return cb(null, `node-commonjs ${o.request}`);
    }
  }
  return cb();
}
