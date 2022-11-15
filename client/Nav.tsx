import { match, publicPath } from "./shared_routes.mjs";
import "./Nav.css";
import { useEffect, useRef, useState } from "react";
import favicon from "./icon.png";

type NavProps = Partial<RouteProps>;
const classnames = (...args) => args.filter((x) => x).join(" ");

const handleClick = async (evt, props) => {
  if (evt.target.tagName !== "A") {
    return;
  }
  const loc = new URL(evt.target.href);
  const route = await match(`${loc.pathname}${loc.search}`);
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
  return props.render(loc);
};

function Nav(props: NavProps) {
  const [isOpen, setIsOpen] = useState(false);
  const navRef = useRef(null);
  useEffect(() => {
    const handler = async (evt) => {
      await handleClick(evt, props);
      if (evt.defaultPrevented || !navRef.current.contains(evt.target)) {
        setIsOpen(() => false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  const handleToggle = () => setIsOpen((isOpen) => !isOpen);

  let items: {
    label: string;
    href: string;
    className?: string;
    filter?: () => boolean;
  }[] = [
    { label: "Blog", href: "/index.html" },
    { label: "Readme", href: "/readme.html" },
    { label: "Weixin", href: "/weixin" },
    { label: "Weather", href: "/mine.html" },
    { label: "Setting", href: "/setting.html" },
  ];
  items = items.filter((item) => {
    if (typeof item.filter === "function") return item.filter();
    return true;
  });
  items = items.map((item) => {
    const className = props.url === item.href ? "nav-link-current" : "";
    return { ...item, className };
  });
  const list = (
    <ul className={"nav-item-group"}>
      {items.map((item) => (
        <li className="nav-item" key={item.label}>
          <a
            className={item.className}
            data-label={item.label}
            href={`${publicPath}${item.href}`}
          >
            {item.label}
          </a>
        </li>
      ))}
    </ul>
  );
  const logo = (
    <a className="nav-logo" title="Home" href={`${publicPath}/index.html`}>
      <img src={favicon} alt="Mr. duck in the gragen" />
    </a>
  );
  const toggle = (
    <button className={"nav-toggle"} onClick={handleToggle}>
      <Toggle isOpen={isOpen} />
    </button>
  );
  return (
    <nav ref={navRef} className={classnames("nav", isOpen && "nav-isopen")}>
      {logo}
      {toggle}
      {list}
    </nav>
  );
}

export default Nav;

function Toggle({ isOpen = false }: { isOpen: boolean }) {
  const fillColor = "#4e4e4e";
  const svgProps = {
    viewBox: "0 0 16 16",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
  };
  return (
    <>
      <svg style={{ display: isOpen ? "block" : "none" }} {...svgProps}>
        <path
          d="M3 3L13 12.9397M13 3.06029L3 13"
          stroke={fillColor}
          strokeWidth="1.5"
        />
      </svg>
      <svg style={{ display: isOpen ? "none" : "block" }} {...svgProps}>
        <rect y="2" width="16" height="1.5" fill={fillColor} />
        <rect y="7.25" width="16" height="1.5" fill={fillColor} />
        <rect y="12.5" width="16" height="1.5" fill={fillColor} />
      </svg>
    </>
  );
}
