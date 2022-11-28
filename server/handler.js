const fs = require("fs");
const http = require("http");
const path = require("path");
const serveHandler = require("serve-handler");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");

const dirs = require("../server/dirs.js");
const { serverlibDir } = dirs;
let credentials = process.env.WENBING_CREDENTIALS_FILE;
if (fs.existsSync(credentials))
  credentials = fs.readFileSync(credentials, "utf8");
const secret = JSON.parse(credentials).API_TOKEN_SECRET;
const importRender = () => require("../server_lib/render");

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
  const { publicPath } = importRender();
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
  const { createDoc, createError } = importRender();
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

const apiHandlers = {
  readme: require("./readme").handler,
  post: async (props) => (await import("./post.mjs")).handler(props),
};

async function apiHandler(req, res, opts = {}) {
  const _404 = () => {
    const statusCode = 404;
    res.writeHead(statusCode, http.STATUS_CODES[statusCode], apiHeaders);
    res.end(JSON.stringify(http.STATUS_CODES[statusCode]));
  };
  const { publicPath } = importRender();
  const headers = req.headers;
  const { pathname, search } = new URL(`http://${headers.host}${req.url}`);
  const apiName = pathname;
  const extname = path.extname(apiName);
  if (extname !== ".json") {
    return _404();
  }
  const apiRoutes = Object.keys(apiHandlers).reduce(
    (acc, routename) => ({
      ...acc,
      [`${publicPath}/${routename}.json`]: apiHandlers[routename],
    }),
    {}
  );
  const handler = apiRoutes[apiName];
  const apiHeaders = { "Content-Type": "application/json" };
  if (!handler) {
    return _404();
  }
  const params = new URLSearchParams(search.slice(1));
  const token = headers.token || params.get("token");
  if (!token) {
    throw new Error(`token is required`);
  }
  jwt.verify(token, secret, { algorithms: "HS256" });
  const props = getProps(req, res);
  const results = await handler(props, opts);
  res.writeHead(200, apiHeaders);
  res.write(JSON.stringify(results));
  res.end();
}

async function reqHandler(req, res, opts) {
  const { publicPath } = importRender();
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
  docHandler,
  apiHandler,
  apiHandlers,
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
