import ReactDOM from "react-dom/client";

import "./client.css";
import { match, publicPath, RouteProps } from "./routes";
import icon from "./icon.png";

const searchParams = new URLSearchParams(location.search);
if (process.env.NODE_ENV === "development" && searchParams.has("istest")) {
  import("./tape-test");
}
const INITIAL_DATA = window.INITIAL_DATA;

(async function main() {
  async function init() {
    const route = match(
      `${publicPath}${INITIAL_DATA.route.pathname}${INITIAL_DATA.route.search}`
    );
    const Component = await route.Component();
    let props: RouteProps = {
      ...INITIAL_DATA,
      favicon: icon,
      route: { ...INITIAL_DATA.route, Component },
      render: handleRender,
    };
    const data = { ...INITIAL_DATA[route.name] };
    props = { ...props, ...data };
    console.log("init props", props);
    return [Component, props];
  }

  async function update(loc) {
    const route = match(`${loc.pathname}${loc.search}`);
    const Component = await route.Component();
    let props: RouteProps = {
      ...INITIAL_DATA,
      favicon: icon,
      route: { ...route, Component },
      render: handleRender,
    };
    let data = { ...INITIAL_DATA[route.name] };
    props = { ...props, ...data };
    if (typeof Component.getInitialData === "function") {
      try {
        data = await Component.getInitialData(props);
      } catch (ex) {
        console.error(ex);
      }
    } else {
      // @TODO
    }
    props = { ...props, ...data };
    console.log("update props", props);
    return [Component, props];
  }

  const container = document.getElementById("app");
  let Component;
  let props;
  [Component, props] = await init();
  const root = ReactDOM.hydrateRoot(container, <Component {...props} />);
  async function handleRender(loc) {
    root.render(<Component isLoading={true} {...props} />);
    [Component, props] = await update(loc);
    root.render(<Component {...props} />);
  }

  window.addEventListener("popstate", async () => {
    await handleRender(document.location);
  });
})();
