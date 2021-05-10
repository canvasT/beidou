#!/usr/bin/env node

'use strict';

const process = require('process');
const { argv } = require('argh');
const fs = require('fs');
const path = require('path');
const builder = require('../lib/builder');

/*
{
  entry: 'act_xxx',
  appConfig: {
    webpack: {},
    view: {},
    isomorphic: {}
    baseDir
  }
}
*/
const { entry, appConfig } = argv;

appConfig = JSON.parse(appConfig)

const compiler = builder({
  target: 'browser',
  entry,
  appConfig,
  dev: false
});

compiler.run((err, stats) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  if (stats) {
    fs.writeFileSync(path.join(process.cwd(), '.stats'), stats);
    console.log(
      stats.toString({
        colors: true,
        children: false,
      })
    );
  }

  console.log('\nBuild finished\n');
});
