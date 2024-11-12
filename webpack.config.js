const path = require('path');

module.exports = {
  entry: './static/js/index.tsx',
  output: {
    filename: 'bundle.js',
    path: path.resolve(__dirname, 'static/dist'),
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx)$/,
        use: 'babel-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
};