import Nav from "./Nav";
import Loading from "./Loading";

const NotFound: RouteComponent = (props: RouteProps) => {
  const { render, route, url, headers } = props;
  return (
    <>
      <Loading isLoading={props.isLoading}></Loading>
      <Nav {...{ render, route, url, headers }}></Nav>
      Not Found
    </>
  );
};

export default NotFound;
