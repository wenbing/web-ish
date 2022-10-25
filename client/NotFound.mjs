import Nav from "./Nav.js";
import Loading from "./Loading.js";

export default function NotFound(props) {
  return (
    <>
      <Nav render={props.render} route={props.route}></Nav>
      <Loading isLoading={props.isLoading}></Loading>
      Not Found
    </>
  );
}
