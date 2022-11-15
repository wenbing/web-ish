const fs = require("fs");
const path = require("path");
const Module = require("module");
const acorn = require("acorn");
const walk = require("acorn-walk");
const findPackageJSON = require("find-package-json");
const { webDir, serverDir, serverlibDir } = require("./dirs.js");
const { execSync } = require("child_process");

async function walker(filepath, importResolve) {
  const deps = [];
  const PUSH_DEPS = (f) => deps.push({ relfile: path.relative(webDir, f) });
  const THROW_ERROR = (msg) => {
    throw new Error(`${msg} at filepath: ${filepath}`);
  };
  const dirname = path.dirname(filepath);
  const source = fs.readFileSync(filepath, { encoding: "utf8" });
  const pkg = findPackageJSON(dirname).next();
  PUSH_DEPS(pkg.filename); // adding package.json

  let ast;
  try {
    let sourceType = pkg.value.type;
    if (path.extname(filepath) === ".mjs") sourceType = "module";
    const acornOpts = { ecmaVersion: 2022, sourceType };
    ast = acorn.parse(source, acornOpts);
  } catch (ex) {
    console.error(ex.message);
    THROW_ERROR("acorn.parse throws");
  }
  const collect = async (arg, loc) => {
    if (
      source.slice(loc.start, loc.end).indexOf("__webpack_require__.u(") !== -1
    ) {
      // do nothing
      return;
    }
    // Literal
    // TemplateLiteral(one quasis, no expression)
    // TemplateLiteral(multi quasis, with query)
    let name;
    if (arg.type === "Literal") {
      name = arg.value;
    } else if (
      arg.type === "TemplateLiteral" &&
      arg.quasis.length === 1 &&
      arg.expressions.length === 0
    ) {
      name = arg.quasis[0].value.raw;
    } else if (arg.type === "TemplateLiteral") {
      const pos = arg.quasis[0].value.raw.indexOf("?");
      if (pos !== -1) {
        name = arg.quasis[0].value.raw.slice(0, pos);
      } else {
        THROW_ERROR("Unknown require or import");
      }
    } else {
      THROW_ERROR("Unknown require or import");
    }
    if (name.startsWith("node:")) {
      name = name.slice("node:".length);
    }
    const slashPosition = name.indexOf("/");
    const isBuiltinModule = Module.builtinModules.includes(
      slashPosition !== -1 ? name.slice(0, slashPosition) : name
    );
    if (isBuiltinModule) {
      return;
    }

    let absfile;
    if (name.startsWith(".")) {
      absfile = require.resolve(name, { paths: [dirname] });
    } else {
      absfile = require.resolve(name);
    }
    PUSH_DEPS(absfile); // adding source file

    if (!name.startsWith(".")) {
      const mabsfile = new URL(await importResolve(name)).pathname;
      if (mabsfile !== absfile) {
        PUSH_DEPS(mabsfile); // adding source file
      }
    }
  };

  const ImportDeclaration = (node) => {
    const { start, end } = node;
    collect(node.source, { start, end });
  };
  const ImportExpression = (node) => {
    const { start, end } = node;
    collect(node.source, { start, end });
  };
  const CallExpression = (node) => {
    if (node.callee.type === "Identifier" && node.callee.name === "require") {
      const { start, end } = node;
      collect(node.arguments[0], { start, end });
    }
  };
  const visitors = { ImportDeclaration, ImportExpression, CallExpression };
  walk.simple(ast, visitors);

  let results = [];
  for (const dep of deps) {
    const { relfile } = dep;
    if (relfile.startsWith("client/")) {
      THROW_ERROR(
        `Unsupported dep, shouldn't require client/ files, relfile: ${relfile}`
      );
    }
    const extname = path.extname(relfile);
    if ([".js", ".cjs", ".mjs", ".json"].includes(extname)) {
      results = results.concat(dep);
    } else {
      THROW_ERROR(`Unknown extname: ${extname}, relfile: ${relfile}`);
    }
    if ([".js", ".cjs", ".mjs"].includes(extname)) {
      results = results.concat(
        await walker(path.join(webDir, relfile), importResolve)
      );
    }
  }
  return results;
}

async function zipFiles() {
  const importResolve = await (
    await import("./bundle-import-resolve.mjs")
  ).default;
  const serverFile = path.join(serverDir, "server.js");
  const { namedChunkGroups } = require("../server_lib/server-stats.json");
  const chunkFiles = Object.keys(namedChunkGroups)
    .reduce((acc, key) => acc.concat(namedChunkGroups[key].assets), [])
    .map((item) => path.join(serverlibDir, item.name));

  let results = await Promise.all(
    [].concat(serverFile, chunkFiles).map((file) => walker(file, importResolve))
  );
  results = [].concat.apply([], results);
  let nodeModules = results
    .filter(({ relfile }) => relfile.startsWith("node_modules/"))
    .map(({ relfile }) => relfile);
  nodeModules = Object.keys(
    nodeModules.reduce((acc, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {})
  );
  nodeModules = nodeModules.join(" ");
  const cmd = `zip -r web-ish-server.zip README.md package*.json server posts server_lib public bootstrap ${nodeModules}`;
  // console.log(cmd);
  const out = execSync(cmd, { encoding: "utf8" });
  console.log(out);
  return out;
}

zipFiles();
