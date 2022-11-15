import Nav from "./Nav";
import Loading from "./Loading";

const NotFound: RouteComponent = (props: RouteProps) => {
  const { render, route, headers } = props;
  return (
    <>
      <Loading isLoading={props.isLoading}></Loading>
      <Nav {...{ render, route, headers }}></Nav>
      Not Found
    </>
  );
};

export default NotFound;
