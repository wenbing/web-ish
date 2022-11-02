const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { DefinePlugin } = require("webpack");
const mode =
  process.env.NODE_ENV === "production" ? "production" : "development";
const { webDir, serverlibDir } = require("../server/dirs.js");
const { outputPublicPath } = require("../client/paths.js");

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
const target = "node";
const defines = {
  "process.env.NODE_ENV": JSON.stringify(mode),
  "process.env.BUILD_TARGET": JSON.stringify(target),
};
if (process.env.GITHUB_PAGES !== undefined) {
  defines["process.env.GITHUB_PAGES"] = JSON.stringify(
    process.env.GITHUB_PAGES
  );
}
const output = {
  path: serverlibDir,
  library: { type: "commonjs2" },
  publicPath: outputPublicPath,
};
const server = {
  mode,
  target,
  devtool: false,
  entry: {
    render: path.resolve(__dirname, "../client/server-entry.mjs"),
  },
  output,
  module: { rules: jsRule.concat(serverCssRule).concat(assetRule) },
  plugins: [new MiniCssExtractPlugin(), new DefinePlugin(defines)],
  externals,
  externalsType: "node-commonjs",
  optimization: { moduleIds: "named", chunkIds: "named", minimize: false },
};

module.exports = server;

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
    } else {
      cb();
    }
  } else {
    const absfile = require.resolve(o.request);
    const extname = path.extname(absfile);
    // extname .js .mjs .cjs .css
    if ([".js", ".cjs", ".mjs"].includes(extname)) {
      cb(null, `node-commonjs ${o.request}`);
    } else if ([".css"].includes(extname)) {
      const relfile = path.relative(webDir, absfile);
      cb(null, `var ${JSON.stringify([o.request, relfile])}`);
    } else {
      cb();
    }
  }
}
