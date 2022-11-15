import path from "path";

export async function toSource(route) {
  const { webDir } = await import("./dirs.js");
  const { Component, ...rest } = route;
  const [ComponentPath, chunkName] = Component;
  const filepath = path.join(webDir, "./client", ComponentPath);
  const dirname = path.dirname(new URL(import.meta.url).pathname);
  const routespath = path.resolve(
    dirname,
    "../client/shared_internal_routes.mjs"
  );
  let relfile = path.relative(path.dirname(routespath), filepath);
  if (!relfile.startsWith(".")) relfile = `./${relfile}`;
  const stringify = (s) => `"${s.replace(/\\/g, "\\\\")}"`;
  const o = { ...rest, _Component: Component, Component };
  return (
    Object.keys(o).reduce((acc, key) => {
      let v;
      if (key === "Component") {
        v = `() => import(/* webpackChunkName: '${chunkName}' */ '${relfile}')`;
      } else if (typeof o[key] === "string") {
        v = stringify(o[key]);
      } else {
        v = JSON.stringify(o[key]);
      }
      return `${acc}    ${key}: ${v},\n`;
    }, "  {\n") + "  }"
  );
}
