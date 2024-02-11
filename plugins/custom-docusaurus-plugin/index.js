const webpack = require('webpack');

module.exports = function (context, options) {
    return {
        name: 'custom-docusaurus-plugin',
        configureWebpack(config, isServer, utils) {
            return {
                module: {
                    rules: [
                        {
                            test: /\.m?js/,
                            resolve: {
                                fullySpecified: false
                            }
                        }
                    ],
                },
                resolve: {
                    alias: {
                        path: require.resolve('path-browserify'),
                        crypto: require.resolve("crypto-browserify"),
                        buffer: require.resolve("buffer/"),
                        stream: require.resolve("stream-browserify"),
                        process: "process/browser",
                    },
                    fallback: {
                        fs: false,
                        ws: false,
                    }
                },
                plugins: [
                    new webpack.ProvidePlugin({
                        process: 'process/browser'
                    })
                ]
            };
        },
    };
};
