
const webpack = require('webpack');
const { env } = require('process');
const isProd = env.NODE_ENV === 'production';
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');
const isNonNil = x => x != null;

const minify = env.MINIFY == 'true';
const pkg = require('./package.json');
const camelcase = require('camelcase');
var path = require('path');

let conf = {
  devtool: isProd ? false : 'inline-source-map',

  entry: './src/index.js',

  output: {
    path:  path.resolve(__dirname, 'build'),
    filename: 'bundle.js',
    library: camelcase( pkg.name ),
    libraryTarget: 'umd'
  },

  externals: isProd ? Object.keys( pkg.dependencies || {} ) : [],

  module: {
    rules: [
      { test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader' }
    ]
  },

  plugins: [
    new webpack.EnvironmentPlugin(['NODE_ENV']),

        minify ? new UglifyJSPlugin() : null
  ].filter( isNonNil )
};

module.exports = conf;
