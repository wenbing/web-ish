const fs = require("fs");
const path = require("path");
const {
  parse,
  AST_NODE_TYPES,
} = require("@typescript-eslint/typescript-estree");
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
  const routeModulePath = path.resolve(__dirname, "../client/routes.ts");
  const routeModuleContent = fs.readFileSync(routeModulePath, "utf8");
  const ast = parse(routeModuleContent, {
    jsx: true,
    range: true,
  });
  const mods = [];
  const ImportExpression = (node) => {
    const [start, end] = node.range;
    const range = routeModuleContent.slice(start, end);
    const comments = range.match(/\/\*([^*/]*)\*\//);
    const value = comments[1];
    const val = vm.runInNewContext(`(function(){return {${value}};})()`);
    mods.push({ source: node.source.value, ...val });
  };
  const tsNodeTypes = Object.keys(AST_NODE_TYPES).filter((name) =>
    name.startsWith("TS")
  );
  const base = { ...walk.base };
  const noop = () => {};
  tsNodeTypes.forEach((type) => (base[type] = noop));
  walk.simple(ast, { ImportExpression }, base);
  return mods;
}
