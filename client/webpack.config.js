const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const StatsWriterPlugin = require("../server/StatsWriterPlugin");
const setupMiddlewares = require("../server/setupMiddlewares");
const mode =
  process.env.NODE_ENV === "production" ? "production" : "development";
const cwd = process.cwd();
const publicDir = path.join(__dirname, "../public");
const serverDir = path.join(__dirname, "../server/lib");
const pagesPublicPath = require("./pagesPublicPath");

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
const client = {
  mode,
  entry,
  output,
  module: { rules: jsRule.concat(cssRule).concat(assetRule) },
  resolve: {
    fallback: {
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      // buffer: require.resolve('buffer'),
      process: require.resolve("process/browser"),
    }),
    new StatsWriterPlugin({ outputPath: serverDir }),
    new MiniCssExtractPlugin(miniCssOpts),
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
    minimizer: [new CssMinimizerPlugin()],
  };
}

module.exports = client;

if (require.main === module) {
  console.log(module.exports);
}
