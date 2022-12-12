module.exports = parseArgv;

function parseArgv() {
  const items = process.argv.slice(2).reverse();
  const args = {};

  while (items.length > 0) {
    let key;
    const item = items.pop();
    if (item.startsWith("--")) {
      key = item.slice("--".length);
      const val = [];
      while (items.length > 0 && !items[items.length - 1].startsWith("--")) {
        val.push(items.pop());
      }
      switch (val.length) {
        case 0:
          args[key] = true;
          break;
        case 1:
          args[key] = val[0];
          break;
        default:
          args[key] = val;
          break;
      }
    }
  }
  return args;
}
