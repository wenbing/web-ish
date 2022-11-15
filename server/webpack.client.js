const path = require("path");
const webpack = require("webpack");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const { BundleStatsWebpackPlugin } = require("bundle-stats-webpack-plugin");
const StatsWriterPlugin = require("../server/StatsWriterPlugin.js");
const setupMiddlewares = require("../server/setupMiddlewares.js");
const mode =
  process.env.NODE_ENV === "production" ? "production" : "development";
const { publicPath, outputPublicPath } = require("../client/shared_paths.js");
const dirs = require("../server/dirs.js");
const { webDir, serverlibDir } = dirs;
const publicDir = dirs.publicDir(publicPath);
const extensions = ["js", "ts", "tsx", "cjs", "mjs"];

const jsRule = [
  {
    test: new RegExp(`\\.(${extensions.join("|")})$`),
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
  client: path.resolve(__dirname, "../client/client-entry.tsx"),
  error: path.resolve(__dirname, "../client/error-entry.ts"),
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
const plugins = [
  new webpack.ProvidePlugin({
    // buffer: require.resolve('buffer'),
    process: require.resolve("process/browser"),
  }),
  new StatsWriterPlugin({ outputPath: serverlibDir }),
  new MiniCssExtractPlugin(miniCssOpts),
  new webpack.DefinePlugin(defines),
];
if (mode === "development") {
  plugins.push(new BundleStatsWebpackPlugin());
}
const client = {
  name: "client",
  mode,
  entry,
  output,
  target,
  module: { rules: [].concat(jsRule, cssRule, assetRule) },
  resolve: {
    fallback: {
      path: require.resolve("path-browserify"),
      stream: require.resolve("stream-browserify"),
    },
    extensions: extensions.map((ext) => `.${ext}`),
  },
  plugins,
  stats: { logging: "info" },
  externals,
};

if (mode === "development") {
  client.devtool = "eval-source-map";
  // client.devtool = "source-map";
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

function externals(o, cb) {
  // o.request startsWith: / ./ ../ \w+|@, aka. filepath or modulename
  if (o.request.startsWith("/") || o.request.startsWith(".")) {
    const r = path.resolve(o.context, o.request);
    const isServerModules = path.relative(webDir, r).startsWith("server/");
    if (isServerModules) {
      cb(null, `node-commonjs ${o.request}`);
      return;
    }
  }
  cb();
}
