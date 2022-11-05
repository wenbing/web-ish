const serverFetch = (url, init) =>
  import("node-fetch").then(({ default: f }) => f(url, init));

module.exports = serverFetch;
