'use strict';

// Webpack common config

const path = require('path');

const reservedKey = 'custom';

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
 *  webpackFactory: {},
 *  IsomorphicPlugin: object
 *  dev: false
 * }
 * @returns
 */
exports.common = (options) => {
  const { appConfig, dev, webpackFactory, entry } = options
  const webpackConfig = appConfig.webpack;
  const viewConfig = appConfig.view;
  const { output } = webpackConfig;
  if (!path.isAbsolute(output.path)) {
    output.path = path.join(appConfig.baseDir, output.path);
  }
  if (!dev && viewConfig.useHashAsset) {
    output.filename = '[name]_[chunkhash:8].js';
    output.chunkFilename = '[name]_[chunkhash:8].js';
  }

  const module = {
    // makes missing exports an error instead of warning
    strictExportPresence: true,
  };

  webpackFactory.definePlugin(options.IsomorphicPlugin);
  const { universal } = appConfig.isomorphic;
  if (universal) {
    webpackFactory.addPlugin(options.IsomorphicPlugin, universal);
  }

  let finalConfig = {};
  for (const key of Object.keys(webpackConfig)) {
    if (key !== reservedKey) {
      // Skip plugin self configs
      finalConfig[key] = webpackConfig[key];
    }
  }
  finalConfig = {
    ...finalConfig,
    bail: !dev,
    devtool: dev ? 'eval-source-map' : false,
    context: appConfig.baseDir,
    entry,
    output,
    module,
  };

  webpackFactory.reset(finalConfig);
};

exports.reservedKey = reservedKey;
