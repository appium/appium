/*global it:true */
"use strict";

var path = require('path')
  , appPath = path.resolve(__dirname, "../../../sample-code/apps/ApiDemos/bin/ApiDemos-debug.apk")
  , appPkg = "com.example.android.apis"
  , appAct = ".ApiDemos"
  , describeWd = require("../../helpers/driverblock.js").describeForApp(appPath,
      "android", appPkg, appAct)
  , should = require('should')
  , net = require('net')
  , appiumPort = process.env.APPIUM_PORT || 4723
  , io = require('socket.io-client');


describeWd('alert dialog detection', function() {

  // set up telnet...
  var runCommands = function(cmds, cb) {
    try {
      var conn = net.createConnection(5554, 'localhost');
      conn.on('connect', function() {
        try {
          for (var i = 0; i < cmds.length; i++) {
            conn.write(cmds[i] + "\n");
          }
          conn.write('quit\n');
          cb(true);
        } catch(err) {
          console.log("Could not run commands: " + err.description);
          cb(undefined);
        }
      }, cb);
    } catch(err) {
      console.log("Couldn't run commands: " + err.description);
    }
  };

  it('should detect low power...', function(done) {
    // setup websocket client...
    var options ={
      transports: ['websocket'],
      'force new connection': true
    };
    try {
      var client = io.connect('http://127.0.0.1:' + appiumPort, options);
      client.on('connect', function() {
        runCommands(['power ac off', 'power capacity 9'], function(success) {
          success.should.equal(true);
        });
      });
      client.on('alert', function() {
        runCommands(['power ac on', 'power capacity 50'], function(success) {
          success.should.equal(true);
          done();
        });
      });
    } catch(err) {
      console.log("Unknown exception: " + err.description);
      done();
    }
  });
});
