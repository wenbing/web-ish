const fs = require("fs");
const http = require("http");
const path = require("path");
const serveHandler = require("serve-handler");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const {
  pathToRegexp,
  match: ptrMatch,
  compile: ptrCompile,
} = require("path-to-regexp");

const dirs = require("../server/dirs.js");
const { serverlibDir } = dirs;
let credentials = process.env.WENBING_CREDENTIALS_FILE;
if (fs.existsSync(credentials))
  credentials = fs.readFileSync(credentials, "utf8");
const secret = JSON.parse(credentials).API_TOKEN_SECRET;
const { publicPath } = require("../server_lib/render");

function isDoc(req) {
  const pathname =
    req.url.indexOf("?") === -1
      ? req.url
      : req.url.slice(0, req.url.indexOf("?"));
  const extname = path.extname(pathname);
  const isDoc =
    req.headers.accept &&
    req.headers.accept.indexOf("text/html") !== -1 &&
    (extname === "" || extname === ".html");
  return isDoc;
}

function isApi(req /*, res, opts*/) {
  const isApiEndpoint = req.url.startsWith(`${publicPath}/api/`);
  const isFetchRequest =
    (req.headers["x-requested-with"] || "").toLowerCase() === "fetch";
  return isApiEndpoint || isFetchRequest;
}

function getProps(req, res, props = {}) {
  const url = req.url;
  const headerKeys = [
    "x-forwarded-proto",
    "host",
    "x-requested-with",
    "x-request-id",
    "user-agent",
  ];
  const headers = {
    ["x-forwarded-proto"]: "http", // default value
    ...pick(req.headers, headerKeys),
    ...props.headers,
  };
  return { ...props, url, headers };
}

async function docHandler(req, res, opts) {
  const { createDoc, createError } = require("../server_lib/render");
  const tokenPayload = { sub: "API" };
  const tokenOpts = { algorithm: "HS256", expiresIn: "7200s" };
  const token = jwt.sign(tokenPayload, secret, tokenOpts);
  const id = uuidv4();
  const props = getProps(req, res, { headers: { token, "x-request-id": id } });
  const docOpts = { serverlibDir, ...opts };
  const docHeaders = { "Content-Type": "text/html" };
  try {
    const doc = await createDoc(props, docOpts);
    res.writeHead(200, docHeaders);
    res.end(doc);
  } catch (error) {
    opts.logger.error("createDoc met error:", error);
    const doc = await createError({ ...props, error }, docOpts);
    const statusCode = 500;
    const statusMessage = http.STATUS_CODES[statusCode];
    res.writeHead(statusCode, statusMessage, docHeaders);
    res.end(doc);
  }
}

const sourceToHandlers = {
  "/readme": require("./readme").handler,
  "/post/:name([A-Za-z0-9_]+)\\.json": async (props) =>
    (await import("./post.mjs")).handler(props),
};

const apiRoutes = Object.entries(sourceToHandlers).map(
  async ([source, handler]) => {
    const keys = [];
    pathToRegexp(source, keys);
    let values; // Custom Matching Parameters
    if (source === "/post/:name([A-Za-z0-9_]+)\\.json") {
      const { getAllPosts } = await import("./post.mjs");
      const names = (await getAllPosts()).map((item) => item.name);
      values = { name: names };
    }
    const s = `${publicPath}${source}`;
    const match = ptrMatch(s, { decode: decodeURIComponent });
    const toPath = ptrCompile(s, { decode: decodeURIComponent });
    return { source: s, match, toPath, handler, keys, values };
  }
);

async function apiHandler(req, res, opts = {}) {
  const apiHeaders = { "Content-Type": "application/json" };
  const _404 = () => {
    const statusCode = 404;
    res.writeHead(statusCode, http.STATUS_CODES[statusCode], apiHeaders);
    res.end(JSON.stringify(http.STATUS_CODES[statusCode]));
  };
  const headers = req.headers;
  const { pathname, search } = new URL(`http://${headers.host}${req.url}`);
  const extname = path.extname(pathname);
  if (extname !== ".json") {
    return _404();
  }
  let matched;
  for (let { source, match, handler } of await Promise.all(apiRoutes)) {
    const result = match(pathname);
    if (result) {
      matched = { source, params: result.params, handler };
      break;
    }
  }
  if (!matched) {
    return _404();
  }
  const params = new URLSearchParams(search.slice(1));
  const token = headers.token || params.get("token");
  if (!token) {
    throw new Error(`token is required`);
  }
  jwt.verify(token, secret, { algorithms: "HS256" });
  const props = { ...getProps(req, res), params: matched.params };
  const results = await matched.handler(props, opts);
  res.writeHead(200, apiHeaders);
  res.write(JSON.stringify(results));
  res.end();
}

async function reqHandler(req, res, opts) {
  if (!req.url.startsWith(publicPath)) {
    throw new Error(`req.url should startsWith ${publicPath}: ${req.url}`);
  }

  if (req.url === "/web-ish/MP_verify_ro7z5FgtK3kjCaRb.txt") {
    res.end("ro7z5FgtK3kjCaRb");
    return;
  }

  if (isApi(req)) {
    await apiHandler(req, res);
    return;
  }
  const publicDir = dirs.publicDir(publicPath);
  if (isDoc(req)) {
    await docHandler(req, res, { ...opts, publicDir });
    return;
  }
  // isAssets
  req.url = req.url.slice(publicPath.length);
  const serveOpts = { public: publicDir, etag: true };
  await serveHandler(req, res, serveOpts);
}

module.exports = {
  isDoc,
  isApi,
  apiRoutes,
  docHandler,
  apiHandler,
  reqHandler,
};

function pick(o, keys) {
  return keys.reduce((acc, key) => {
    if (o[key] === undefined) {
      return acc;
    } else {
      return { ...acc, [key]: o[key] };
    }
  }, {});
}
