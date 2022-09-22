import React from 'react'
import { Writable } from 'stream';
import { renderToPipeableStream } from 'react-dom/server';

import App from './App'


export async function createDoc(opts) {
    const { publicPath, pathname } = opts
    const initialData = { pathname, ...App.getInitialData() }
    const app = <App {...initialData} />

    const content = await new Promise((resolve, reject) => {
        let body = ''
        const writable = new Writable({
            write(chunk, encoding, callback) {
                body += chunk
                callback()
            }
        })
        const handleError = (error) => reject(error)
        const rs = renderToPipeableStream(app, {
            onShellError: handleError,
            // onError: handleError,
            onAllReady() {
                rs.pipe(writable).on('finish', () => {
                    resolve(body)
                })
            }
        })
    })

    const doc = html`<!doctype html>
<html>
    <head>
    </head>
    <body>
        <div id="hello-world">${content}</div>
        <script>window.INITIAL_DATA = ${JSON.stringify(initialData)}</script>
        <script src="${publicPath}client.js" async></script>
    </body>
</html>
    `
    return doc
}


function html(strings, ...args) {
    const len = strings.length
    let result = ''
    for (let i = 0; i < len - 1; i++) {
        result += strings[i] + args[i]
    }
    result += strings[len - 1]
    return result
}
