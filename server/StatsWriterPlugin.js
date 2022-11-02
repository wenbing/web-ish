const fs = require("fs");
const path = require("path");
const acorn = require("acorn");
const walk = require("acorn-walk");
const vm = require("vm");

class StatsWriterPlugin {
  constructor({ outputPath }) {
    this.opts = {
      filename: "stats.json",
      stats: {
        preset: "none",
        builtAt: true,
        publicPath: true,
        chunkGroups: true, // namedChunkGroups
      },
    };
    const filepath = path.resolve(outputPath, this.opts.filename);
    // if (fs.existsSync(filepath)) fs.rmSync(filepath)
    this.filepath = filepath;
  }
  apply(compiler) {
    compiler.hooks.done.tap("stats-writer-plugin", (stats) => {
      let result = stats.toJson(this.opts.stats);
      const { builtAt, publicPath, namedChunkGroups } = result;

      const routeMods = getRouteMods();
      result = {
        builtAt,
        publicPath,
        namedChunkGroups,
        routeMods,
      };

      const content = JSON.stringify(result, null, 2);
      const filepath = this.filepath;
      try {
        fs.mkdirSync(path.dirname(filepath));
      } catch (ex) {
        if (ex.code !== "EEXIST") throw ex;
      }
      fs.writeFileSync(filepath, content);
    });
  }
}

module.exports = StatsWriterPlugin;

function getRouteMods() {
  const routeModulePath = path.resolve(__dirname, "../client/routes.mjs");
  const routeModuleContent = fs.readFileSync(routeModulePath, "utf8");
  const ast = acorn.parse(routeModuleContent, {
    ecmaVersion: 2022,
    sourceType: "module",
  });
  const mods = [];
  const ImportExpression = (node) => {
    const range = routeModuleContent.slice(node.start, node.end);
    const comments = range.match(/\/\*([^\*\/]*)\*\//);
    const value = comments[1];
    const val = vm.runInNewContext(`(function(){return {${value}};})()`);
    mods.push({ source: node.source.value, ...val });
  };
  walk.simple(ast, { ImportExpression });
  return mods;
}
