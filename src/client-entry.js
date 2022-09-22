import React from 'react'
import ReactDOM from 'react-dom/client'

import App from './App'

const appProps = window.INITIAL_DATA
const app = <App {...appProps} />
const root = ReactDOM.hydrateRoot(document.getElementById('hello-world'), app)
console.log(root)