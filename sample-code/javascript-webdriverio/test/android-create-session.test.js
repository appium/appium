var webdriverio = require('webdriverio');
var androidOptions = require('../helpers/caps').androidOptions;
var app = require('../helpers/apps').androidApiDemos;
var assert = require('chai').assert;

androidOptions.desiredCapabilities.app = app;


describe('Create Android session', function () {
  var client;

  before(function () {
    client = webdriverio.remote(androidOptions);
    return client.init();
  });

  it('should create and destroy a session', function () {
    return client
      .sessions(function (res) {
        assert.isAbove(res.value.length, 0);
      })
      .currentActivity(function (res) {
        assert.equals(res.value, '.ApiDemos');
      })
      .getCurrentPackage(function (res) {
        assert.equals(res.value, 'io.appium.android.apis');
      })
      .end()
      .sessions(function (res) {
        assert.equals(res.value.length, 0);
      });
  });
});