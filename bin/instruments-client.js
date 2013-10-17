#!/usr/bin/env node
"use strict";

var net = require('net')
  , ap = require('argparse').ArgumentParser;

var connect = function(args) {
  var client = net.connect({path: args.socket}, function() {
    var data = {event: "cmd"};
    if (args.result) {
      data.result = JSON.parse(args.result);
    }
    data = JSON.stringify(data);
    client.end(data, "utf8");
  });
  client.on('data', function(data) {
    data = JSON.parse(data);
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
module.exports.connect = function(result, socket) {
  var args = {result: result, socket: socket};
  connect(args);
};
