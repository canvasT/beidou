'use strict';

const webpack = require('webpack');
const helper = require('../utils');

module.exports = (app, target = 'browser', options) => {
  helper.injectPlugin(app);
  const config = app.config.webpack;
  const webpackConfig = helper.getWebpackConfig(app, config, target);
  if (options.entry) {
    let oEntrys = webpackConfig.entry
    Object.keys(oEntrys).forEach((item) => {
      if (options.entry !== item) {
        delete oEntrys[item]
      }
    })
  }

  console.log('[tt]beidou-webpack builder, webpackConfig:', webpackConfig)

  const compiler = webpack(webpackConfig);
  return compiler;
};
