const fs = require("fs");
const path = require("path");

class StatsWriterPlugin {
  constructor({ outputPath }) {
    this.opts = {
      filename: "stats.json",
      stats: {
        preset: "none",
        publicPath: true,
        entrypoints: true,
        chunkGroupAuxiliary: true,
        chunkGroupChildren: true,
      },
    };
    const filepath = path.resolve(outputPath, this.opts.filename);
    // if (fs.existsSync(filepath)) fs.rmSync(filepath)
    this.filepath = filepath;
  }
  apply(compiler) {
    compiler.hooks.done.tap("stats-writer-plugin", (stats) => {
      const result = stats.toJson(this.opts.stats);
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
