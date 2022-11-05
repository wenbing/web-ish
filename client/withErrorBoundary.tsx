import React from "react";
import hoistNonReactStatic from "hoist-non-react-statics";
import { RouteComponent, RouteProps } from "./routes";

export default (Component: RouteComponent) => {
  class ErrorBoundary extends React.Component {
    props: RouteProps;
    state: Readonly<{ error: null | Error }>;
    constructor(props: RouteProps) {
      super(props);
      this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
      return { error };
    }
    componentDidCatch(/*error, errorInfo*/) {
      // @TODO logger.error
    }
    render() {
      const props = {
        ...this.props,
        error: this.state.error,
      };
      return <Component {...props} />;
    }
  }
  const Enhance: RouteComponent = hoistNonReactStatic(ErrorBoundary, Component);
  return Enhance;
};
