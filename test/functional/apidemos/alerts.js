"use strict";

var env = require('../../helpers/env')
  , setup = require("../common/setup-base")
  , desired = require("./desired")
  , net = require('net')
  , io = require('socket.io-client');

describe("apidemos - alerts -", function () {

  setup(this, desired);

  // set up telnet...
  var runCommands = function (cmds, cb) {
    try {
      var conn = net.createConnection(5554, 'localhost');
      conn.on('connect', function () {
        try {
          for (var i = 0; i < cmds.length; i++) {
            conn.write(cmds[i] + "\n");
          }
          conn.write('quit\n');
          cb(true);
        } catch (err) {
          console.log("Could not run commands: " + err.description);
          cb(undefined);
        }
      }, cb);
    } catch (err) {
      console.log("Couldn't run commands: " + err.description);
    }
  };

  it('should detect low power...', function (done) {
    // setup websocket client...
    var options = {
      transports: ['websocket'],
      'force new connection': true
    };
    try {
      var client = io.connect('http://127.0.0.1:' + env.APPIUM_PORT, options);
      client.on('connect', function () {
        runCommands(['power ac off', 'power capacity 9'], function (success) {
          success.should.equal(true);
        });
      });
      client.on('alert', function () {
        runCommands(['power ac on', 'power capacity 50'], function (success) {
          success.should.equal(true);
          done();
        });
      });
    } catch (err) {
      console.log("Unknown exception: " + err.description);
      done();
    }
  });
});