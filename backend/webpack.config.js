const path = require('path')

module.exports = {
  entry: {
    bundle: path.join(__dirname, './src/index.ts'),
  },

  target: 'webworker',

  output: {
    filename: 'worker.js',
    path: path.join(__dirname, 'dist'),
  },

  mode: 'development',

  watchOptions: {
    ignored: /node_modules|dist|\.js/g,
  },

  devtool: 'none',

  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    plugins: [],
  },

  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'awesome-typescript-loader',
      },
    ],
  },
}
