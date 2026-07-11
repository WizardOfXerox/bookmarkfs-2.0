const path = require('path');
const CopyPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: {
        bundle: './src/index.js',
        sandbox: './src/sandbox.js'
    },
    mode: 'development',
    devtool: false,
    experiments: {
        asyncWebAssembly: true, // ✅ node-unrar-js uses WASM internally
        topLevelAwait: true
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
        fallback: {
            // No need to polyfill Node APIs anymore 🚀
            fs: false,
            path: false,
            child_process: false,
            util: false,
            process: false,
        },

    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: "node_modules/node-unrar-js/dist/js/unrar.wasm", to: "unrar.wasm" }
            ]
        })
    ],
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist'),
    },
};