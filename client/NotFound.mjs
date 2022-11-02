import Nav from "./Nav.js";
import Loading from "./Loading.js";

export default function NotFound(props) {
  return (
    <>
      <Loading isLoading={props.isLoading}></Loading>
      <Nav
        render={props.render}
        route={props.route}
        headers={props.headers}
      ></Nav>
      Not Found
    </>
  );
}
