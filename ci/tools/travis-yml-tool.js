#!/usr/bin/env node

'use strict';

var args = process.argv.slice(2),
  assert = require('assert'),
  _ = require('underscore');

if (args.length !==2 ) {
  console.warn('Usage travis.yml-tool.js <.travis.yml> <config.yml>');
  process.exit(1);
}

var DEFAULTS = {
  SAUCE_REST_ROOT:'https://saucelabs.com/rest/v1',
  APPIUM_HOST:'ondemand.saucelabs.com',
  APPIUM_PORT:80,
  IOS_CONCURRENCY:10,
  ANDROID_CONCURRENCY:10,
  SELENDROID_CONCURRENCY:3,
  GAPPIUM_CONCURRENCY:3
};

var fs = require("fs");
var target = fs.readFileSync(args[0], 'UTF8');
var config = fs.readFileSync(args[1], 'UTF8');

// replace secure env variable
var secureLines = config.match(/^\s*- secure.*/gm).join('\n');
secureLines = secureLines.replace(/^\s*-/mg, '  -');
assert(secureLines);
target = target.replace(/(^\s*- secure.*\r?\n)+/m, '  # <SECURE>\n');
target = target.replace(/^  # <SECURE>.*$/m, secureLines);

// replace env variables
_([
  'SAUCE_REST_ROOT', 'APPIUM_HOST','APPIUM_PORT', 'SAUCE_USERNAME',
  'IOS_CONCURRENCY', 'ANDROID_CONCURRENCY', 'SELENDROID_CONCURRENCY',
  'GAPPIUM_CONCURRENCY'
]).each(function (varName) {
  var regex = new RegExp('- ' + varName + '=.*');
  var m = config.match(regex);
  var line = m ? m[0] : null;
  if (!line && DEFAULTS[varName]) {
    line = '- ' + varName + '=' + DEFAULTS[varName];
  }
  regex = new RegExp('- ' + varName + '=.*','g');
  target = target.replace(regex, line);
});

fs.writeFileSync(args[0], target, 'UTF8');

