let fetch;
if (process.env.BUILD_TARGET === "web") {
  fetch = window.fetch;
}
if (process.env.BUILD_TARGET === "node") {
  fetch = (...args) =>
    import("../server/fetch.js").then((m) => m.default(...args));
}
export default fetch;
