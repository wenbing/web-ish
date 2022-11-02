const fs = require("fs");
const path = require("path");
const Module = require("module");
const acorn = require("acorn");
const walk = require("acorn-walk");
const findPackageJSON = require("find-package-json");
const { webDir, serverDir } = require("./dirs.js");
const { execSync } = require("child_process");

function walker(filepath) {
  const deps = [];
  const dirname = path.dirname(filepath);
  const str = fs.readFileSync(filepath, { encoding: "utf8" });
  const pkg = findPackageJSON(dirname).next();
  const sourceType = pkg.value.type;
  // adding package.json
  deps.push({ relfile: path.relative(webDir, pkg.filename) });
  let ast;
  try {
    ast = acorn.parse(str, { ecmaVersion: 2022, sourceType });
  } catch (ex) {
    console.error("acorn.parse throws, filepath:" + filepath);
    throw ex;
  }
  const collect = (arg, loc) => {
    // Literal TemplateLiteral(one quasis, no expression)
    let name;
    if (arg.type === "Literal") {
      name = arg.value;
    } else if (
      arg.type === "TemplateLiteral" &&
      arg.quasis.length === 1 &&
      arg.expressions.length === 0
    ) {
      name = arg.quasis[0].value.raw;
    } else {
      if (
        str.slice(loc.start, loc.end).indexOf("__webpack_require__.u(") !== -1
      ) {
        // do nothing
        return;
      } else {
        throw new Error("Unknown require or import at filepath:" + filepath);
      }
    }
    if (name.startsWith("node:")) {
      name = name.slice("node:".length);
    }
    let isBuiltinModule = Module.builtinModules.includes(name);
    const slashPosition = name.indexOf("/");
    if (slashPosition !== -1) {
      isBuiltinModule = Module.builtinModules.includes(
        name.slice(0, slashPosition)
      );
    }
    if (isBuiltinModule) return;
    let absfile;
    if (name.startsWith(".")) {
      absfile = require.resolve(name, { paths: [dirname] });
    } else {
      absfile = require.resolve(name);
    }
    const relfile = path.relative(webDir, absfile);
    // adding source file
    deps.push({ relfile });
  };
  walk.simple(ast, {
    ImportDeclaration(node) {
      const arg = node.source;
      const { start, end } = node;
      collect(arg, { start, end });
    },
    ImportExpression(node) {
      const arg = node.source;
      const { start, end } = node;
      collect(arg, { start, end });
    },
    CallExpression(node) {
      if (node.callee.type === "Identifier" && node.callee.name === "require") {
        const arg = node.arguments[0];
        const { start, end } = node;
        collect(arg, { start, end });
      }
    },
  });
  return [].concat.apply(
    deps,
    deps.map(({ relfile }) => {
      const absfile = path.join(webDir, relfile);
      const extname = path.extname(absfile);
      if (extname === ".json") return [];
      if (relfile.startsWith("client/")) {
        throw new Error("Unsupported kind of dep, relfile: " + relfile);
      }
      if ([".js", ".cjs", ".mjs"].includes(extname)) {
        return walker(absfile);
      }
      throw new Error("Unknown extname:" + extname + ", filepath:" + relfile);
    })
  );
}

function zipFiles() {
  const deps = [].concat(
    walker(path.join(serverDir, "server.js")),
    // TODO visit webpackChunkNames
    walker(path.join(serverDir, "config-wx.js"))
  );
  let nodeModules = deps
    .filter(({ relfile }) => relfile.startsWith("node_modules/"))
    .map(({ relfile }) => relfile);
  // console.log(nodeModules);
  nodeModules = nodeModules.join(" ");

  const cmd = `zip -r web-ish-server.zip server server_lib public bootstrap ${nodeModules}`;
  // console.log(cmd);
  const out = execSync(cmd, { encoding: "utf8" });
  return out;
}

// async function uploadZipFile() {
//   const core = require("@huaweicloud/huaweicloud-sdk-core");
//   const functiongraph = require("@huaweicloud/huaweicloud-sdk-functiongraph");

//   const credentialsFile = process.env["HUAWEICLOUD_CREDENTIALS"];
//   if (credentialsFile === undefined) {
//     throw new Error('Please supplies process.env["HUAWEICLOUD_CREDENTIALS"]');
//   }
//   const secrets = fs
//     .readFileSync(credentialsFile, "utf-8")
//     .split("\n")[1]
//     .split(",");
//   const [_, ak, sk] = secrets;
//   const endpoint = "https://functiongraph.cn-north-4.myhuaweicloud.com";
//   const project_id = "68c2079e0a504fb080c24c9c65070ccd";

//   const credentials = new core.BasicCredentials()
//     .withAk(ak)
//     .withSk(sk)
//     .withProjectId(project_id);
//   const client = functiongraph.FunctionGraphClient.newBuilder()
//     .withCredential(credentials)
//     .withEndpoint(endpoint)
//     .build();
//   const request = new functiongraph.ImportFunctionRequest();
//   const body = new functiongraph.ImportFunctionRequestBody();
//   const filename = "web-ish-server.zip";
//   body.withFileCode(fs.readFileSync(`./${filename}`).toString("base64"));
//   body.withFileType("zip");
//   body.withFileName(filename);
//   body.withFuncName("web-ish");
//   request.withBody(body);
//   const result = await client.importFunction(request);
//   if (result.status !== 200) {
//     const ex = new Error(result.message);
//     ex.raw = result;
//     throw ex;
//   }
//   return result;
// }

console.log(zipFiles());
// console.log(uploadZipFile());
