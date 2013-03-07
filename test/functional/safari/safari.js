/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForSafari()
  , webviewTests = require("../../helpers/webview.js").buildTests
  , should = require('should');

describeWd('safari init', function(h) {
  it('getting current window should work initially', function(done) {
    h.driver.windowHandle(function(err, handleId) {
      should.not.exist(err);
      handleId.should.equal('1');
      done();
    });
  });
});

webviewTests('safari');
