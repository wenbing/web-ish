const fs = require("fs");
const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const mode =
  process.env.NODE_ENV === "production" ? "production" : "development";
const cwd = process.cwd();
const serverDir = path.resolve(__dirname, "../server/lib");

const jsRule = [
  {
    test: /\.m?js$/,
    exclude: /node_modules/,
    use: {
      loader: "babel-loader",
      options: {
        presets: [
          ["@babel/preset-env", { targets: "node 16.16" }],
          "@babel/preset-react",
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
const externals = ({ request }, callback) => {
  const deps = require("../package.json").dependencies;
  const name = request.split("/")[0];
  const inDeps = Object.keys(deps).indexOf(name) !== -1;
  if (inDeps) {
    callback(null, `commonjs ${request}`);
  } else {
    callback();
  }
};
const server = {
  mode,
  target: "node",
  devtool: false,
  entry: {
    render:
      "./" +
      path.relative(cwd, path.resolve(__dirname, "../client/server-entry.js")),
  },
  output: { path: serverDir, library: { type: "commonjs2" } },
  module: { rules: jsRule.concat(serverCssRule).concat(assetRule) },
  plugins: [new MiniCssExtractPlugin()],
  externals,
};

module.exports = server;

if (require.main === module) {
  console.log(module.exports);
}
