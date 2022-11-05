import Nav from "./Nav";
import Loading from "./Loading";
import { RouteComponent, RouteProps } from "./routes";

const NotFound: RouteComponent = (props: RouteProps) => {
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
};

export default NotFound;
