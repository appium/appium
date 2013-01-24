/*global it:true, describe:true, before:true, after:true, beforeEach:true */
/*global afterEach:true */
"use strict";

var runServer = require("../../server.js").run
  , should = require("should")
  , path = require("path");

describe("appiumutils", function() {

  var appium = null;
  var device = null;
  var server = null;
  var onServerClose = function() {};

  before(function(done) {
    server = runServer({
      app: path.resolve(__dirname, "../../sample-code/apps/UICatalog/build/Release-iphonesimulator/UICatalog.app")
      , verbose: false
      , udid: null
      , port: 4723
      , address: '127.0.0.1'
      , remove: true }
      , function(appiumServer) {
          appium = appiumServer;
          done();
        }
      , function() {
          onServerClose();
        }
    );
  });

  beforeEach(function(done) {
    appium.start({}, function() {
      device = appium.device;
      done();
    });
  });

  afterEach(function(done) {
    appium.stop(done);
  });

  after(function(done) {
    onServerClose = done;
    server.close();
  });

  it('should get device details', function(done) {
    device.proxy("au.getDeviceDetail()", function(err, res) {
      should.not.exist(err);
      should.exist(res.value.deviceName);
      should.exist(res.value.deviceModel);
      should.exist(res.value.systemName);
      should.exist(res.value.systemVersion);
      done();
    });
  });

});
