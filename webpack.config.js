/*-----------------------------------------------------------------------------
 * Copyright 2022 AI Singapore
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *----------------------------------------------------------------------------*/

// @ts-check

"use strict";

/** @typedef {import('webpack').Configuration} WebpackConfig **/

const path = require("path");

const config = {
  target: "node",
  node: {
    __dirname: false,
    __filename: false,
  },
  entry: {
    extension: "./client/src/extension.ts",
    languageserver: "./server/out/server.js",
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js",
    libraryTarget: "commonjs2",
    devtoolModuleFilenameTemplate: "../[resource-path]",
  },
  devtool: "source-map",
  externals: {
    // the vscode-module is created on-the-fly and must be excluded. Add other
    // modules that cannot be webpack'ed,
    // 📖 -> https://webpack.js.org/configuration/externals/
    vscode: "commonjs vscode",
    prettier: "commonjs prettier",
  },
  resolve: {
    // support reading TypeScript and JavaScript files,
    // 📖 -> https://github.com/TypeStrong/ts-loader
    extensions: [".ts", ".js"],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        exclude: /node_modules/,
        use: [
          {
            loader: "ts-loader",
          },
        ],
      },
    ],
  },
};

module.exports = [config];
