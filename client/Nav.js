import { useEffect } from "react";
import { match, pagesPublicPath } from "./routes";

function Nav(props) {
  const destination = props.route.destination;
  const handleClick = (evt) => {
    if (evt.target.tagName !== "A") {
      return;
    }
    evt.preventDefault();
    const { pathname } = new URL(evt.target.href);
    const route = match(pathname);
    const shouldReplace = route && route.destination === destination;
    history[shouldReplace ? "replaceState" : "pushState"]({}, "", pathname);
    props.render(pathname);
  };

  return (
    <ul className="nav" onClick={handleClick}>
      <li>
        <a
          className={destination === "/index.html" ? "nav-item-current" : ""}
          href={`${pagesPublicPath}/index.html`}
        >
          Home
        </a>
      </li>
      <li>
        <a
          className={destination === "/setting.html" ? "nav-item-current" : ""}
          href={`${pagesPublicPath}/setting.html`}
        >
          Setting
        </a>
      </li>
    </ul>
  );
}

export default Nav;
