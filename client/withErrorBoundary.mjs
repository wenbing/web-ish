import React from "react";
import hoistNonReactStatic from "hoist-non-react-statics";

export default (Component) => {
  class ErrorBoundary extends React.Component {
    constructor(props) {
      super(props);
      this.state = { error: null };
    }
    static getDerivedStateFromError(error) {
      return { error };
    }
    componentDidCatch(error, errorInfo) {
      // @TODO logger.error
    }
    render() {
      const props = this.props;
      return <Component error={this.state.error} {...props} />;
    }
  }
  const Enhance = hoistNonReactStatic(ErrorBoundary, Component);
  return Enhance;
};
