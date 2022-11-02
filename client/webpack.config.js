const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const StatsWriterPlugin = require("../server/StatsWriterPlugin");
const setupMiddlewares = require("../server/setupMiddlewares");
const mode =
  process.env.NODE_ENV === "production" ? "production" : "development";
const { publicPath, outputPublicPath } = require("../client/paths.js");
const dirs = require("../server/dirs.js");
const { serverlibDir } = dirs;
const publicDir = dirs.publicDir(publicPath);

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
  client: path.resolve(__dirname, "./client-entry.js"),
  error: path.resolve(__dirname, "./error-entry.js"),
};
const output = {
  path: publicDir,
  filename: "[name].js",
  chunkFilename: "[name].js",
  publicPath: outputPublicPath,
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
const defines = {
  "process.env.NODE_ENV": JSON.stringify(mode),
  "process.env.BUILD_TARGET": JSON.stringify(target),
};
if (process.env.GITHUB_PAGES !== undefined) {
  defines["process.env.GITHUB_PAGES"] = JSON.stringify(
    process.env.GITHUB_PAGES
  );
}
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
  // externals,
  plugins: [
    new webpack.ProvidePlugin({
      // buffer: require.resolve('buffer'),
      process: require.resolve("process/browser"),
    }),
    new StatsWriterPlugin({ outputPath: serverlibDir }),
    new MiniCssExtractPlugin(miniCssOpts),
    new webpack.DefinePlugin(defines),
  ],
  stats: { logging: "info" },
};

if (mode === "development") {
  client.devtool = "eval-source-map";
  client.devServer = {
    hot: true,
    // port: 3000,
    port: 80,
    allowedHosts: [".zhengwenbing.com"],
    setupMiddlewares,
    static: { directory: publicDir, publicPath },
    devMiddleware: { publicPath },
  };
} else if (mode === "production") {
  const cacheGroups = {
    ["react-dom"]: {
      chunks: "all",
      enforce: true,
      test: /[\\/]node_modules[\\/]react-dom[\\/]/,
      name: "react-dom",
    },
  };
  client.optimization = {
    splitChunks: { cacheGroups },
    moduleIds: "deterministic",
    minimizer: ["...", new CssMinimizerPlugin()],
  };
}

module.exports = client;

if (require.main === module) {
  console.log(module.exports);
}
