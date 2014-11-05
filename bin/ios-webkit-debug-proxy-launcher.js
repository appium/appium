#!/usr/bin/env node

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

var spawn = require('child_process').spawn,
    _ = require('underscore');

var args = process.argv.slice(2);

var RESTART_ON_MESSAGES = [
  'Invalid message _rpc_applicationUpdated'];
var PROXY_CMD = 'ios_webkit_debug_proxy';

function startProxy() {
  console.log('RUNNING:', PROXY_CMD, args.join(' '));

  var proxy = spawn(PROXY_CMD, args);

  proxy.stdout.on('data', function (data) {
    console.log('stdout: ' + data);
  });

  proxy.stderr.on('data', function (data) {
    console.log('stderr: ' + data);
    var restartMessage = _(RESTART_ON_MESSAGES).find(function (message) {
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
}

startProxy();

