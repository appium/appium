#!/usr/bin/env node
"use strict";

var net = require('net')
  , ap = require('argparse').ArgumentParser;

var connect = function (args) {
  var client = net.connect({path: args.socket}, function () {
    var data = {event: "cmd"};
    if (args.result) {
      process.stderr.write("Sending result to server: " + args.result);
      try {
        data.result = JSON.parse(args.result);
      } catch (e) {
        process.stderr.write(e.message);
        throw e;
      }
    }
    process.stderr.write("Sending response to server");
    data = JSON.stringify(data);
    client.end(data, "utf8");
  });
  client.on('data', function (data) {
    try {
      data = JSON.parse(data);
    } catch (e) {
      process.stderr.write(e.message);
      throw e;
    }
    process.stderr.write("Received response from server: " + JSON.stringify(data));
    process.stdout.write(data.nextCommand);
    client.end();
    process.exit(0);
  });
};

var parser = new ap({
  version: '0.0.1',
});
parser.addArgument(['-r', '--result'], {defaultValue: null, required: false});
parser.addArgument(['-s', '--socket'], {defaultValue: '/tmp/instruments_sock', required: false});

if (module === require.main) {
  var args = parser.parseArgs();
  connect(args);
}

module.exports.parser = parser;
module.exports.connect = function (result, socket) {
  var args = {result: result, socket: socket};
  connect(args);
};
