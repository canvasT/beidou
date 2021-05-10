'use strict';

const path = require('path');
const fs = require('fs');
const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const colorz = require('colorz');
const { stringify } = require('q-i');
const boxen = require('boxen');
const FallbackPort = require('fallback-port');
const _ = require('lodash');
const debug = require('debug')('beidou:webpack');
const { argv } = require('argh');
const IsomorphicPlugin = require('../plugin/isomorphic');
const entryLoader = require('../loader/entry-loader');
const WebpackFactory = require('../factory/webpack');

const symbol = Symbol.for('webpackServer');

function getAvaliablePort(defaultPort, app) {
  const fallback = new FallbackPort(defaultPort);
  const port = fallback.getPort();
  if (port !== defaultPort) {
    app.logger.warn(
      '[webpack] port %s is in used, use %s instead',
      defaultPort,
      port
    );
  }
  return port;
}

function getCustomWebpackCfgPath(app) {
  const options = app.config.webpack;
  if (options.config) {
    // TODO: remove support at next major version
    app.beidouDeprecate(
      '`webpack.config`, use `webpack.custom.configPath` instead'
    );
    return options.config;
  } else if (options.custom && options.custom.configPath) {
    return options.custom.configPath;
  }
  return null;
}

const dumpWebpackConfig = function (agent, config) {
  const { rundir } = agent.config;

  try {
    /* istanbul ignore if */
    if (!fs.existsSync(rundir)) fs.mkdirSync(rundir);
    // dump config meta
    const file = path.join(rundir, `webpack.${agent.config.env}.json`);
    fs.writeFileSync(
      file,
      JSON.stringify(
        config,
        (key, val) => {
          if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
            const type = val.constructor.name || 'Unknown';
            if (type === 'RegExp') {
              return val.toString();
            }

            if (type !== 'Object') {
              return Object.assign({
                [`<${type}>`]: _.toPlainObject(val),
              });
            }
          }
          return val;
        },
        2
      )
    );
  } catch (err) {
    agent.logger.warn(`dumpConfig error: ${err.message}`);
  }
};

function parseDevFromArgv() {
  try {
    let dev = false;
    if (argv.dev) {
      dev = true;
    } else if (argv.argv && argv.argv[0]) {
      const [rawArgs] = argv.argv;
      const args = JSON.parse(rawArgs);
      dev = args.dev !== 'false';
    }
    return dev;
  } catch (e) {
    return false;
  }
}

const getWebpackConfig = (options) => {
  const { appConfig } = options;
  let client = appConfig.client
  let webpackConfig = null;
  options.webpackFactory = new WebpackFactory();
  Object.getPrototypeOf(options.webpackFactory).init();
  const defaultConfigPath = path.join(
    __dirname,
    `../../config/webpack/webpack.browser.js`
  );

  const entry = {
    [options.entry]: path.resolve(client, `./${options.entry}/index.jsx`)
  }
  options.entry = entry

  webpackConfig = require(defaultConfigPath)(options);
  webpackConfig.entry = entry

  return webpackConfig;
};

const injectPlugin = (options) => {
  options.IsomorphicPlugin = IsomorphicPlugin;
};

const printEntry = function (entry) {
  console.log(
    boxen(
      `${colorz.magenta('Auto Load Webpack Entry:')}\n\n${stringify(entry)}`,
      {
        padding: 1,
        borderStyle: 'double',
        borderColor: 'yellow',
        float: 'left',
      }
    )
  );
};

const startServer = (config, port, logger, agent) => {
  if (agent[symbol]) {
    throw new Error('Multi webpack dev server instance found');
  }

  const compiler = webpack(config);
  let lastCompileResult = false;
  const cb = ({ compilation }) => {
    const ok = compilation.errors.length === 0;
    ok &&
      !lastCompileResult &&
      logger.info('[webpack]', colorz.green('compile done'));
    lastCompileResult = ok;
  };

  if (compiler.hooks) {
    const plugin = { name: 'BeidouWebpackPlugin' };

    compiler.hooks.done.tap(plugin, cb);
  } else {
    compiler.plugin('done', cb);
  }

  const server = new WebpackDevServer(compiler, config.devServer);

  server.middleware.waitUntilValid(() => {
    logger.info('[webpack] webpack server start, listen on port: %s', port);
    printEntry(config.entry);
    process.send({ action: 'webpack-server-ready', to: 'app', data: { port } });
    // tell worker process what the server port is
    const portMessageHandler = (info) => {
      if (info.action === 'ask-for-webpack-server-port') {
        process.send({
          action: 'webpack-server-ready',
          to: 'app',
          data: { port },
        });
      }
    };

    process.on('message', portMessageHandler);
    server._removeListener = function () {
      process.removeListener('message', portMessageHandler);
    };
  });
  server.listen(port, '0.0.0.0', (err) => {
    if (err) {
      logger.error('[Beidou Agent] webpack server start failed,', err);
    }
  });
  agent[symbol] = server;
  // dump config
  dumpWebpackConfig(agent, config);
  return server;
};
const closeServer = function (agent) {
  if (agent[symbol]) {
    const server = agent[symbol];
    server.close();
    agent[symbol] = null;
    server._removeListener && server._removeListener();
  }
};

const restartServer = function (config, port, logger, agent) {
  logger.info('[webpack-dev-server] auto restart');
  closeServer(agent);
  startServer(config, port, logger, agent);
};

exports.startServer = startServer;
exports.closeServer = closeServer;
exports.injectPlugin = injectPlugin;
exports.restartServer = restartServer;
exports.printEntry = printEntry;
exports.getWebpackConfig = getWebpackConfig;
exports.dumpWebpackConfig = dumpWebpackConfig;
