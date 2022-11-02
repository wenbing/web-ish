import { match, publicPath } from "./routes.mjs";
import "./Nav.css";

function Nav(props) {
  const { pathname, search } = props.route;
  const handleClick = async (evt) => {
    if (evt.target.tagName !== "A") {
      return;
    }
    const loc = new URL(evt.target.href);
    const route = match(`${loc.pathname}${loc.search}`);
    if (props.route.Component !== (await route.Component())) {
      return;
    }
    if (props.error) {
      return;
    }
    evt.preventDefault();
    const shouldReplace =
      route &&
      route.destination === props.route.destination &&
      route.search === props.route.search;
    history[shouldReplace ? "replaceState" : "pushState"](
      {},
      "",
      `${loc.pathname}${loc.search}`
    );
    props.render(loc);
  };

  const inWeixin =
    props.headers["x-requested-with"] === "com.tencent.mm" ||
    props.headers["user-agent"].match(/\swechatdevtools\//) !== null;
  let items = [
    { label: "Home", href: "/index.html" },
    { label: "Mine", href: "/mine.html" },
    { label: "Weixin", href: "/weixin", filter: () => inWeixin },
    { label: "Setting", href: "/setting.html" },
  ];
  items = items.filter((item) => {
    if (typeof item.filter === "function") return item.filter();
    return true;
  });
  items = items.map((item) => {
    const className =
      `${pathname}${search}` === item.href ? "nav-link-current" : "";
    return { ...item, className };
  });
  return (
    <ul className="nav" onClick={handleClick}>
      {items.map((item) => (
        <li className="nav-item" key={item.label}>
          <a className={item.className} href={`${publicPath}${item.href}`}>
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
}

export default Nav;
