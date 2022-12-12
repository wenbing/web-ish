const path = require("path");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const { DefinePlugin } = require("webpack");
const mode =
  process.env.NODE_ENV === "production" ? "production" : "development";
const { webDir, serverlibDir } = require("../server/dirs.js");
const { outputPublicPath } = require("../client/shared_paths.js");
const extensions = ["js", "ts", "tsx", "cjs", "mjs"];

class ServerStatsWriterPlugin {
  constructor() {
    this.opts = {
      filename: "server-stats.json",
      stats: {
        preset: "none",
        builtAt: true,
        publicPath: true,
        chunkGroups: true, // namedChunkGroups
      },
    };
  }
  apply(compiler) {
    compiler.hooks.done.tap("server-stats-writer-plugin", (stats) => {
      let result = stats.toJson(this.opts.stats);
      const { builtAt, publicPath, namedChunkGroups } = result;
      result = { builtAt, publicPath, namedChunkGroups };
      const content = JSON.stringify(result, null, 2);
      const filepath = path.join(
        compiler.options.output.path,
        this.opts.filename
      );
      compiler.outputFileSystem.writeFileSync(filepath, content);
    });
  }
}

const jsRule = [
  {
    test: new RegExp(`\\.(${extensions.join("|")})$`),
    exclude: /node_modules/,
    use: {
      loader: "babel-loader",
      options: {
        presets: [
          ["@babel/preset-env", { targets: "node 14" }],
          ["@babel/preset-react", { runtime: "automatic" }],
          ["@babel/preset-typescript", { allExtensions: true, isTSX: true }],
        ],
      },
    },
  },
];
const assetRule = [
  {
    test: /\.(png|jpe?g|gif|webp|svg|eot|ttf|woff|woff2)$/i,
    type: "asset",
    generator: {
      emit: false,
    },
  },
  {
    test: /favicon(_x\d+)?.(webp|svg)$/i, // favicon always as resource
    type: "asset/resource",
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
const output = {
  path: serverlibDir,
  iife: false,
  library: { type: "commonjs2" },
  assetModuleFilename: "[name]-[hash][ext]",
  publicPath: outputPublicPath,
};
const server = {
  name: "server",
  dependencies: ["client"],
  mode,
  devtool: false,
  target,
  entry: {
    render: path.resolve(__dirname, "../client/server-entry.tsx"),
  },
  output,
  module: { rules: [].concat(jsRule, serverCssRule, assetRule) },
  resolve: {
    extensions: extensions.map((ext) => `.${ext}`),
  },
  plugins: [
    new MiniCssExtractPlugin(),
    new DefinePlugin(defines),
    new ServerStatsWriterPlugin(),
  ],
  externals,
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
