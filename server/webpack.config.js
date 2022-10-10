const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { DefinePlugin } = require("webpack");
const mode =
  process.env.NODE_ENV === "production" ? "production" : "development";
const cwd = process.cwd();
const webDir = path.join(__dirname, "../");
const serverDir = path.resolve(__dirname, "../server_lib");
const pkg = require("../package.json");
const pagesPublicPath = require("../client/pagesPublicPath");

const jsRule = [
  {
    test: /\.m?js$/,
    exclude: /node_modules/,
    use: {
      loader: "babel-loader",
      options: {
        presets: [
          ["@babel/preset-env", { targets: "node 16.16" }],
          ["@babel/preset-react", { runtime: "automatic" }],
          ["@babel/preset-typescript", { allExtensions: true, isTSX: true }],
        ],
      },
    },
  },
];
const assetRule = [
  {
    test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/i,
    type: "asset",
    generator: {
      emit: false,
    },
  },
];
const serverCssRule = [
  {
    test: /\.css$/i,
    use: [
      { loader: MiniCssExtractPlugin.loader, options: { emit: false } },
      "css-loader",
    ],
  },
];
const externals = (o, cb) => {
  // o.request startsWith: / ./ ../ \w+|@, aka. filepath or modulename
  if (o.request.startsWith("/") || o.request.startsWith(".")) {
    const r = path.resolve(o.context, o.request);
    const isServerModules = path.relative(webDir, r).startsWith("server/");
    if (isServerModules) {
      return cb(null, `node-commonjs ${o.request}`);
    }
    const isServerUsed =
      o.contextInfo.issuer &&
      path.relative(webDir, o.contextInfo.issuer).startsWith("server/");
    const isNodeModules = path.relative(webDir, r).startsWith("node_modules/");
    if (isServerUsed && isNodeModules) {
      return cb(null, `node-commonjs ${o.request}`);
    }
    return cb();
  } else {
    const deps = Object.assign({}, pkg.dependencies, pkg.devDependencies);
    const name = o.request.split("/")[0];

    const inDeps = Object.keys(deps).includes(name);
    if (inDeps) {
      return cb(null, `node-commonjs ${o.request}`);
    }
    return cb(null, o.request);
  }
};
const target = "node";
const server = {
  mode,
  target,
  devtool: false,
  entry: {
    render:
      "./" +
      path.relative(cwd, path.resolve(__dirname, "../client/server-entry.js")),
  },
  output: {
    path: serverDir,
    library: { type: "commonjs2" },
    publicPath:
      process.env.GITHUB_PAGES === "true"
        ? `https://wenbing.github.io${pagesPublicPath}/`
        : `${pagesPublicPath}/`,
  },
  module: { rules: jsRule.concat(serverCssRule).concat(assetRule) },
  plugins: [
    new MiniCssExtractPlugin(),
    new DefinePlugin({ "process.env.BUILD_TARGET": JSON.stringify(target) }),
  ],
  externals,
  externalsType: "node-commonjs",
  optimization: { moduleIds: "named", chunkIds: "named", minimize: false },
};

module.exports = server;

if (require.main === module) {
  console.log(module.exports);
}
