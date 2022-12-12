const fs = require("fs");
const http = require("http");
const path = require("path");
const serveHandler = require("serve-handler");
const jwt = require("jsonwebtoken");
const etag = require("etag");
const cookie = require("cookie");
const { v1: uuidv1, v4: uuidv4 } = require("uuid");
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
    (extname === "" &&
      req.headers.accept &&
      req.headers.accept.indexOf("text/html") !== -1) ||
    extname === ".html";
  return isDoc;
}

function isApi(req /*, res, opts*/) {
  const pathname =
    req.url.indexOf("?") === -1
      ? req.url
      : req.url.slice(0, req.url.indexOf("?"));
  const isExtJSON = path.extname(pathname) === ".json";
  const isApiEndpoint = req.url.startsWith(`${publicPath}/api/`);
  const isFetchRequest =
    (req.headers["x-requested-with"] || "").toLowerCase() === "fetch";
  const isResource = ["manifest.webmanifest", "sw.js"].includes(
    path.basename(pathname)
  );
  return isApiEndpoint || isFetchRequest || isExtJSON || isResource;
}

function getProps(req, res, props = {}) {
  const url = req.url;
  // static?
  // shared? server only?
  const headerKeys = [
    /* shared */
    "host",
    "user-agent",
    "x-forwarded-proto",
    "x-requested-with",

    /* meta */
    "theme-color",

    /* server only */
    "referer",
    /* variable */
    "if-none-match", // http header

    /* variable */
    "token", // read from document.cookie
    "x-request-id", // read from document.cookie
  ];
  const defaults = {
    ["x-forwarded-proto"]: req.socket.encrypted ? "https" : "http",
    "theme-color": { light: "#f5f7f0", dark: "#181a0e" },
  };
  const headers = {
    ...defaults,
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
  const reqid = uuidv4();
  const cookieOpts = {
    path: publicPath,
    sameSite: true,
    maxAge: 60 * 60 * 2,
    secure: true,
  };
  const setCookie = [
    cookie.serialize("token", token, cookieOpts),
    cookie.serialize("x-request-id", reqid, cookieOpts),
  ];
  const props = getProps(req, res, {
    headers: { token, "x-request-id": reqid },
  });
  const docOpts = { serverlibDir, ...opts };
  let [statusCode, headers, body] = [];
  try {
    const doc = await createDoc(props, docOpts);
    const tag = etag(doc, {});
    if (tag === req.headers["if-none-match"]) {
      [statusCode, headers, body] = [304];
    } else {
      [statusCode, headers, body] = [200, { etag: tag }, doc];
    }
  } catch (error) {
    opts.logger.error("createDoc met error:", error);
    const doc = await createError({ ...props, error }, docOpts);
    [statusCode, headers, body] = [500, {}, doc];
  }
  headers = { "set-cookie": setCookie, ...headers };
  return [statusCode, headers, body];
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
  const apiHeaders = { "Content-Type": "application/json; charset=utf-8" };
  const _404 = () => {
    const statusCode = 404;
    const body = JSON.stringify(http.STATUS_CODES[statusCode]);
    return [statusCode, apiHeaders, body];
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
  const cookies = cookie.parse(req.headers.cookie || "");
  const token = cookies.token || params.get("token");
  if (!token) {
    const error = new Error(`token is required`);
    error.statusCode = 412;
    throw error;
  }
  jwt.verify(token, secret, { algorithms: "HS256" });
  const props = { ...getProps(req, res), params: matched.params };
  const results = await matched.handler(props, opts);
  const body = JSON.stringify(results);
  return [200, apiHeaders, body];
}

async function reqHandler(req, res, opts) {
  if (!req.url.startsWith(publicPath)) {
    const ex = new Error(`req.url should startsWith ${publicPath}: ${req.url}`);
    ex.statusCode = 400;
    throw ex;
  }

  if (req.url === `${publicPath}/MP_verify_ro7z5FgtK3kjCaRb.txt`) {
    return "ro7z5FgtK3kjCaRb";
  }

  if (req.url === `${publicPath}/manifest.webmanifest`) {
    const id = process.env.NODE_ENV === "development" ? uuidv1() : "";
    const handler = (await import(`./manifest.mjs?id=${id}`)).handler;
    let [statusCode, headers, body] = await handler({ headers: req.headers });
    if (body !== undefined) body = JSON.stringify(body);
    return [statusCode, headers, body];
  }

  if (req.url === `${publicPath}/sw.js`) {
    const id = process.env.NODE_ENV === "development" ? uuidv1() : "";
    const handler = (await import(`./sw_worker.mjs?id=${id}`)).handler;
    return await handler({ headers: req.headers });
  }

  if (isApi(req)) {
    return await apiHandler(req, res);
  }
  const publicDir = dirs.publicDir(publicPath);
  if (isDoc(req)) {
    return await docHandler(req, res, { ...opts, publicDir });
  }
  // isAssets
  req.url = req.url.slice(publicPath.length);
  const customHeaders = [];
  if (process.env.NODE_ENV === "production") {
    const cacheControl = {
      source: "**/*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000" }],
    };
    customHeaders.push(cacheControl);
  }
  const serveOpts = {
    cleanUrls: false,
    etag: true,
    headers: customHeaders,
    public: publicDir,
  };
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
