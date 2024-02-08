module.exports = function (context, options) {
    return {
        name: 'custom-docusaurus-plugin',
        configureWebpack(config, isServer, utils) {
            return {
                resolve: {
                    alias: {
                        path: require.resolve('path-browserify'),
                        crypto: require.resolve("crypto-browserify"),
                        buffer: require.resolve("buffer/"),
                        stream: require.resolve("stream-browserify")
                    },
                    fallback: {
                        fs: false,
                    }
                },
            };
        },
    };
};