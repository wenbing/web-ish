const fs = require("fs");
const path = require("path");

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
    compiler.hooks.done.tap("stats-writer-plugin", async (stats) => {
      let result = stats.toJson(this.opts.stats);
      const { builtAt, publicPath, namedChunkGroups } = result;
      result = { builtAt, publicPath, namedChunkGroups };
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
