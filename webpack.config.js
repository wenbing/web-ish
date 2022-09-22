const path = require('path')

const jsRule = [
    {
        test: /\.m?js$/,
        exclude: /node_modules/,
        use: { loader: 'babel-loader', options: { presets: ['@babel/preset-env', '@babel/preset-react'] } }
    }
]

module.exports = [
    {
        mode: process.env.NODE_ENV,
        entry: {
            client: './src/client-entry',
        },
        output: { path: path.join(__dirname, './public'), publicPath: '/' },
        module: { rules: jsRule }
    },
    {
        mode: process.env.NODE_ENV,
        target: 'node',
        entry: {
            render: './src/server-entry.js',
        },
        output: { path: path.join(__dirname, './server/lib'), library: { type: 'commonjs2' } },
        module: { rules: jsRule },
    }
]

if (require.main === module) {
    console.log(module.exports)
}