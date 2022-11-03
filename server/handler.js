const fs = require("fs");
const path = require("path");
const http = require("http");
const serveHandler = require("serve-handler");
const jwt = require("jsonwebtoken");

const dirs = require("../server/dirs.js");
const { serverlibDir } = dirs;
const secret = process.env.API_TOKEN_SECRET;

function pick(o, keys) {
  return keys.reduce((acc, key) => {
    if (o[key] === undefined) {
      return acc;
    } else {
      return { ...acc, [key]: o[key] };
    }
  }, {});
}

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

function isApi(req, res, opts) {
  const { publicPath } = opts;
  const isApiEndpoint = req.url.startsWith(`${publicPath}/api/`);
  return isApiEndpoint;
}

function createApiToken() {
  const payload = { sub: "API" };
  const token = jwt.sign(payload, secret, {
    algorithm: "HS256",
    expiresIn: "7200s",
  });
  return token;
}

async function docHandler(req, res, opts) {
  const { createDoc, createError, ...rest } = opts;
  const docOpts = { serverlibDir, ...rest };
  const token = createApiToken();
  const headerKeys = [
    "user-agent",
    "x-requested-with",
    "x-forwarded-proto",
    "host",
  ];
  const headers = {
    ["x-forwarded-proto"]: "http",
    ...pick(req.headers, headerKeys),
    token,
  };
  const initials = {
    url: req.url,
    headers,
  };
  try {
    const doc = await createDoc(initials, docOpts);
    res.writeHead(200, {
      "Content-Type": "text/html",
    });
    res.end(doc);
  } catch (error) {
    opts.logger.error("createDoc met error:", error);
    const doc = await createError({ ...initials, error }, docOpts);
    res.writeHead(500, http.STATUS_CODES[500], {
      "Content-Type": "text/html",
    });
    res.end(doc);
  }
}

async function apiHandler(req, res, opts) {
  const headers = req.headers;
  const { pathname, search } = new URL(`http://${headers.host}${req.url}`);
  const handlers = {};
  const routes = Object.keys(handlers).reduce(
    (acc, routename) => ({
      ...acc,
      [`/${routename}`]: handlers[routename],
    }),
    {}
  );
  const handler = routes[pathname];
  if (!handler) {
    const statusCode = 404;
    res.writeHead(statusCode, http.STATUS_CODES[statusCode]);
    res.end(JSON.stringify(http.STATUS_CODES[statusCode]));
    return;
  }
  const params = new URLSearchParams(search.slice(1));
  const token = headers.token || params.get("token");
  if (!token) {
    throw new Error(`req.headers.token is required`);
  }
  jwt.verify(token, secret, { algorithms: "HS256" });
  const results = await handler(req, res, opts);
  res.write(JSON.stringify(results));
  res.end();
}

async function reqHandler(req, res, opts) {
  // http://localhost:3000/web-ish/api/weixin/access_token
  const { render, ...rest } = opts;
  const { publicPath, createDoc, createError } = render;
  const publicDir = dirs.publicDir(publicPath);
  if (!req.url.startsWith(publicPath)) {
    throw new Error(`req.url should startsWith ${publicPath}: ${req.url}`);
  }

  if (req.url === "/web-ish/MP_verify_ro7z5FgtK3kjCaRb.txt") {
    res.end("ro7z5FgtK3kjCaRb");
    return;
  }

  if (isApi(req, res, { publicPath })) {
    await apiHandler(req, res, {});
    return;
  }
  if (isDoc(req)) {
    const docOpts = { ...rest, publicPath, publicDir, createDoc, createError };
    await docHandler(req, res, docOpts);
    return;
  }
  req.url = req.url.slice(publicPath.length);
  const serveOpts = { public: publicDir, etag: true };
  await serveHandler(req, res, serveOpts);
}

module.exports = { isDoc, isApi, docHandler, apiHandler, reqHandler };
