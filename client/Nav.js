import { match, publicPath } from "./routes";
import "./Nav.css";

function Nav(props) {
  const { pathname, search, destination } = props.route;
  const handleClick = (evt) => {
    if (evt.target.tagName !== "A") {
      return;
    }
    evt.preventDefault();
    const loc = new URL(evt.target.href);
    const route = match(`${loc.pathname}${loc.search}`);
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

  return (
    <ul className="nav" onClick={handleClick}>
      <li className="nav-item">
        <a
          className={
            `${pathname}${search}` === "/index.html" ? "nav-link-current" : ""
          }
          href={`${publicPath}/index.html`}
        >
          Home
        </a>
      </li>
      <li className="nav-item">
        <a
          className={
            `${pathname}${search}` === "/mine.html" ? "nav-link-current" : ""
          }
          href={`${publicPath}/mine.html`}
        >
          Mine
        </a>
      </li>
      <li className="nav-item">
        <a
          className={
            `${pathname}${search}` === "/setting.html" ? "nav-link-current" : ""
          }
          href={`${publicPath}/setting.html`}
        >
          Setting
        </a>
      </li>
    </ul>
  );
}

export default Nav;
