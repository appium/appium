/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = "ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , should = require('should')
  , telnet = require('telnetclient')
  , io = require('socket.io-client');


describeWd('alert dialog detection', function(h) {
  // setup websocket client...
  var options ={
    transports: ['websocket'],
    'force new connection': true
  };
  var client = io.connect('http://127.0.0.1:4723', options);

  // set up telnet...
  var runCommands = function(cmds, cb) {
    var client = new telnet.Client('127.0.0.1', 5554, {}, function(socket) {
    })
    .on('data',function(d,e) {})
    .on('end',function() {})
    for (var i=0; i<cmds.length; i++) {
      client.socket.write(cmds[i] + "\n");
    };
    client.socket.end();
    cb();
  };

  var triggerLowPower = function(cb) {
    runCommands(['power ac off', 'power capacity 9'], function() {
      cb();
    });
  };

  var restorePower = function(cb) {
    runCommands(['power ac on', 'power capacity 50'], function() {
      cb();
    });
  };

  it('should detect low power...', function(done) {
    client.on('alert', function() {
      console.log("Recieved alert message");
      restorePower(function() {
        console.log("Restored power");
      });
      done();
    });
    triggerLowPower(function() {
      console.log("Triggered low power");
    });
  });
});
