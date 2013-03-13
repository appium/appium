/*global it:true, describe:true, before:true, after:true, beforeEach:true */
/*global afterEach:true */
"use strict";

var runServer = require("../../../server.js").run
  , should = require("should")
  , path = require("path");

describe("appiumutils", function() {

  var appium = null;
  var device = null;
  var server = null;
  var onServerClose = function() {};

  before(function(done) {
    server = runServer({
      app: path.resolve(__dirname, "../../../sample-code/apps/WebViewApp/build/Release-iphonesimulator/WebViewApp.app")
      , verbose: false
      , udid: null
      , launch: false
      , log: path.resolve(__dirname, "../../../appium.log")
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
      device.proxy('au.timeout(0)', function(err, res) {
        should.not.exist(err);
        res.status.should.equal(0);
        done();
      });
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
      res.status.should.equal(0);
      should.exist(res.value.deviceName);
      should.exist(res.value.deviceModel);
      should.exist(res.value.systemName);
      should.exist(res.value.systemVersion);
      done();
    });
  });

  it('should background the app', function(done) {
    device.proxy("au.backgroundApp(2)", function(err, res) {
      should.not.exist(err);
      res.status.should.equal(0);
      done();
    });
  });

  it('should set implicit wait', function(done) {
    device.proxy("au.timeout(5)", function(err, res) {
      should.not.exist(err);
      res.status.should.equal(0);
      done();
    });
  });

  it('should have elements', function(done) {
    device.proxy("wd_frame.getTree()", function (err, res) {
      should.not.exist(err);
      should.ok(res.value);
      done();
    });
  });

  it('should respond nicely to js errors', function(done) {
    device.proxy("blargimarg", function(err, res) {
      should.not.exist(err);
      res.status.should.equal(17);
      done();
    });
  });
});
