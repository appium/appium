#!/usr/bin/env node

/* eslint no-console:0 */

/*
 * Small tool, launching and monitoring ios-web-kit-proxy, and relauching
 * on predefined errors.
 *
 * Usage:
 *  ./bin/ios-webkit-debug-proxy-launcher.js [args]
 *  args: ios-webkit-debug-proxy args (they will be passed over)
 *
 * Example:
 *  ./bin/ios-webkit-debug-proxy-launcher.js -c <UDID>:27753 -d
 *
 *  Note:
 *   For iOS8.1 try this first:
 *     brew install --HEAD ideviceinstaller
 */

"use strict";

const spawn = require('child_process').spawn;
const _ = require('lodash');

const args = process.argv.slice(2);

const RESTART_ON_MESSAGES = [
  'Invalid message _rpc_applicationUpdated',
  'Invalid message _rpc_applicationSentListing'];

const PROXY_CMD = 'ios_webkit_debug_proxy';
let proxy;

const handleKillProcess = function (exitCode) {
  console.log('\nKilling proxy process!');
  proxy.kill('SIGTERM');
  process.exit((exitCode || 0));
};

const startProxy = function () {
  console.log('RUNNING:', PROXY_CMD, args.join(' '));

  proxy = spawn(PROXY_CMD, args);

  proxy.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
  });

  proxy.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
    const restartMessage = _(RESTART_ON_MESSAGES).find(function (message) {
      return ('' + data).indexOf(message) >= 0;
    });
    if (restartMessage) {
      console.log('Detected error message:', restartMessage);
      console.log('Killing proxy!');
      proxy.kill('SIGTERM');
      process.nextTick(startProxy);
    }
  });

  proxy.on('close', function (code) {
    console.log('child process exited with code ' + code);
  });
};

process.on('SIGINT', handleKillProcess);
process.on('SIGTERM', handleKillProcess);

startProxy();
