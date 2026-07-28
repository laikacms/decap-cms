const path = require('path');
const nodeExternals = require('webpack-node-externals');
const { NODE_ENV = 'production' } = process.env;

module.exports = {
  entry: { index: path.resolve(__dirname, 'src', 'index.ts') },
  mode: NODE_ENV,
  target: 'node',
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    libraryTarget: 'commonjs2',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: ['ts-loader'],
      },
    ],
  },
  externals: [
    nodeExternals(),
    nodeExternals({ modulesDir: path.resolve(__dirname, path.join('..', '..', 'node_modules')) }),
  ],
};
