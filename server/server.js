const fs = require('fs')
const path = require('path')
const http = require('http')
const handler = require('serve-handler')

const { createDoc } = require('./lib/render')
const webpackConfig = require('../webpack.config')
const publicDir = path.resolve(__dirname, '../public')
const publicPath = webpackConfig[0].output.publicPath

async function writeDoc({ pathname }) {
  let doc
  try {
    doc = await createDoc({ publicPath, pathname })
  } catch (ex) {
    console.error('writeDoc met', ex.stack);
    return
  }
  const filepath = path.join(publicDir, (pathname || '/index').slice(1) + '.html')
  try { fs.mkdirSync(path.dirname(filepath)) } catch (ex) { if (ex.code !== 'EEXIST') throw ex }
  fs.writeFileSync(filepath, doc)
}

const server = http.createServer(async function (req, res) {
  const pathname = req.url
  if (req.headers.accept.indexOf('text/html') !== -1 && !fs.existsSync(path.join(publicDir, pathname))) {
    let doc
    try {
      doc = await createDoc({ publicPath, pathname })
    } catch (ex) {
      res.writeHead(500);
      res.end(ex.stack);
      return
    }
    res.end(doc)
    return
  }
  await handler(req, res, {
    public: publicDir,
  });
})

if (require.main === module) {
  const cliOpts = parseArgv()
  // writeDoc({ pathname: cliOpts.pathname })
  server.listen(3000, '0.0.0.0', function () {
    console.log(`server is listening at http://localhost:3000`)
  })
}


function parseArgv() {
  const items = process.argv.slice(2).reverse()
  const args = {}
  let key
  let val
  while (key = items.pop()) {
    if (key.startsWith('--')) {
      key = key.slice('--'.length)
    }
    if (key === 'pathname') {
      val = items.pop()
    }
    if (key && val) {
      args[key] = val
    }
  }
  return args
}