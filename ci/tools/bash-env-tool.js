#!/usr/bin/env node

'use strict';

var yaml = require('js-yaml'),
    fs = require('fs'),
    _ = require('underscore');

var args = process.argv.slice(2);

function usage() {
  console.warn("Usage:");
  console.warn("   $(ci/tools/bash-env-tool.js set <config>)");
  console.warn("   $(ci/tools/bash-env-tool.js unset)");
  console.warn("   ci/tools/bash-env-tool.js show");
  process.exit(1);
}

var ENV_VARIABLES = ['SAUCE_USERNAME', 'SAUCE_ACCESS_KEY', 'SAUCE_REST_ROOT',
  'APPIUM_HOST', 'APPIUM_PORT'];

if (args.length < 1) usage();

function set() {
  if (args.length < 2) usage();
  var doc = yaml.load(fs.readFileSync(args[1], 'utf8'));
  _(doc).chain()
    .filter(function (line) { return typeof line === 'string'; })
    .map(function (line) {
      var m = line.match(/^(.+)=(.*)$/);
      if (m) {
        return {key: m[1], value: m[2]};
      }
    }).filter(function (keyVal) {
      return ENV_VARIABLES.indexOf(keyVal.key) >= 0;
    }).each(function (keyVal) {
      console.log('export', keyVal.key + '=' + keyVal.value);
    });
}

function unset() {
  _(ENV_VARIABLES).each(function (key) {
    console.log('unset', key);
  });
}

function show() {
  _(ENV_VARIABLES).each(function (key) {
    console.log(key, '-->', process.env[key] ? process.env[key] : 'not set');
  });
}

switch (args[0]) {
  case 'set':
    set();
    break;
  case 'unset':
    unset();
    break;
  case 'show':
    show();
    break;
  default:
    usage();
}