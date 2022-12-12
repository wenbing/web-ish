declare module "*.png" {
  const content: string;
  export default content;
}

declare module "*.webp" {
  const content: string;
  export default content;
}

declare module "*.svg" {
  const content: string;
  export default content;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface TYPE_INITIAL_DATA extends Record<string, any> {
  url: string;
  headers: Record<string, string>;
}

declare interface Window {
  INITIAL_DATA: TYPE_INITIAL_DATA;
}

declare interface GetInitialData {
  // (props: RouteProps): Record<string, unknown>;
  (props: RouteProps & Record<string, unknown>): Promise<
    Record<string, unknown>
  >;
}

declare type RouteLocation = { pathname: string; search: string };
declare type RouteComponent = React.ComponentType<RouteProps> & {
  getInitialData?: GetInitialData;
  title?: string;
  ThemeContext?: React.Context<Record<string, unknown>>;
};

declare interface DefinedRoute {
  name: string;
  source: RegExp;
  destination: string;
  Component: () => Promise<RouteComponent>;
}

declare interface MatchedRoute {
  name: string;
  pathname: string;
  search: string;
  destination: string | null;
  Component: () => Promise<RouteComponent>;
}

declare interface Route {
  name: string;
  pathname: string;
  params?: Record<string, unknown>;
  search: string;
  destination: string | null;
  Component: RouteComponent;
}

declare interface RouteProps {
  url: string;
  headers: Record<string, unknown>;
  route: Route;
  title?: string;
  error?: Error;
  isLoading?: boolean;
  render?: () => void;
}
