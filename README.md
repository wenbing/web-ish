# Labs

- static, https://wenbing.github.io/web-ish/
- functiongraph, https://e0bff515591548a3a9c63be2086e4a8e.apig.cn-north-4.huaweicloudapis.com/web-ish

## Scripts

```json
{
  "start": "npx webpack serve --config client/webpack.config.js",
  "build-client": "npx webpack --config client/webpack.config.js",
  "build-server": "npx webpack --config server/webpack.config.js",
  "build": "node server/build.js",
  "build-pages": "node server/build.js --pathname / /mine.html /setting.html",
  "bundle": "node server/bundle.js",
  "server": "node server/server.js"
}
```
