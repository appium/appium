#!/usr/bin/env node
"use strict";

var net = require('net')
  , repl = require('repl')
  , colors = require('colors')
  , appium  = require('../server')
  , parser = require('./parser')
  ;

var startRepl = function() {
  var help = function() {
    console.log("\nWelcome to the Appium CLI".cyan);
    console.log(" - Access the appium object via the object: 'appium'".grey);
    console.log(" - appium.run is the function to start the server".grey);
    console.log(" - args is the default params data structure".grey);
    console.log(" - set args.app then run appium.run(args);\n".grey);
    return 'Thanks for asking';
  };

  help();

  var r = repl.start('(appium): ');
  r.context.appium = appium;
  r.context.parser = parser();
  r.context.help = help;
  r.context.args = {
    app: '/path/to/test/app'
    , verbose: true
    , udid: null
    , address: '127.0.0.1'
    , port: 4723
  };

  var connections = 0;
  var server = net.createServer(function (socket) {
    connections += 1;
    socket.setTimeout(5*60*1000, function() {
      socket.destroy();
    });
    repl.start("(appium): ", socket);
  }).listen(process.platform === "win32" ? "\\\\.\\pipe\\node-repl-sock-" + process.pid : "/tmp/node-repl-sock-" + process.pid);

  r.on('exit', function () {
    server.close();
    process.exit();
  });
};

if (process.argv[2] === "shell") {
  startRepl();
}
else {
  var args = parser().parseArgs();
  args.verbose = true;
  //console.log("Pre-flight check ...".grey);
  appium.run(args, function() { /* console.log('Rock and roll.'.grey); */ });
}
