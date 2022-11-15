# Labs in the Garden

## Links

- **static:** https://wenbing.github.io/web-ish
- **labs:** https://labs.zhengwenbing.com/web-ish
- **huawei functiongraph:** https://e0bff515591548a3a9c63be2086e4a8e.apig.cn-north-4.huaweicloudapis.com/web-ish
- **wechat cloudrun:** https://web-ish-14527-5-1314605107.sh.run.tcloudbase.com/web-ish

## Scripts

```json
{
  "start": "npx webpack serve",
  "build-client": "npx webpack --config server/webpack.client.js",
  "build-server": "npx webpack --config server/webpack.server.js",
  "build": "node server/build.js",
  "build-pages": "node server/build.js --pathname all",
  "bundle": "node server/bundle.js",
  "server": "node server/server.js"
}
```

## Features Set

- minimal codebase, minimal dependencies
- server side initial data and client side incremental updated data,
  based on a route component, and a familiar data structure: props
- unified html rendering, include development pages, static pages and server pages
- unified single page application and multiple pages application
- general available server request handler, easily to integrate
