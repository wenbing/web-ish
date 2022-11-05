declare module "*.png" {
  const content: string;
  export default content;
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface INITIAL_DATA_TYPE extends Record<string, any> {
  builtAt: number;
  favicon: string;
  url: string;
  headers: Record<string, string>;
}

declare interface Window {
  INITIAL_DATA: INITIAL_DATA_TYPE;
}
