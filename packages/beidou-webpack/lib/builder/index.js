'use strict';

const webpack = require('webpack');
const helper = require('../utils');

/**
 *
 * @param {*} options
 * {
 *  appConfig: {
 *    view: {},
 *    webpack: {},
 *    baseDir: '',
 *    isomorphic: {}
 *  },
 *  entry: xx,
 *  dev: false,
 * }
 * @returns
 */
module.exports = (options) => {
  // let {
  //   entry,
  // } = options
  helper.injectPlugin(options);
  const webpackConfig = helper.getWebpackConfig(options);
  // if (entry) {
  //   let oEntrys = webpackConfig.entry
  //   Object.keys(oEntrys).forEach((item) => {
  //     if (entry !== item) {
  //       delete oEntrys[item]
  //     }
  //   })
  // }

  const compiler = webpack(webpackConfig);
  return compiler;
};
