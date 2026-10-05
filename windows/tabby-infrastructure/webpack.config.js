const path = require('path')

module.exports = {
  target: 'node',
  entry: path.resolve(__dirname, 'src/index.ts'),
  devtool: 'source-map',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'index.js',
    libraryTarget: 'umd',
    globalObject: 'this',
  },
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        loader: 'ts-loader',
        options: {
          transpileOnly: true,
        },
        exclude: /node_modules/,
      },
    ],
  },
  externals: [
    /^@angular\//,
    /^@ng-bootstrap\//,
    /^rxjs(\/.*)?$/,
    /^tabby-/,
    'net',
    'fs',
    'path',
    'os',
    'child_process',
    'events',
    'crypto',
    'stream',
  ],
}
