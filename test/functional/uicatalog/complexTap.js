/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , _s = require('underscore.string')
  , should = require('should');

describeWd('complex tap', function(h) {
  return it('should work', function(done) {
    h.driver.execute("mobile: tap", [1, 1, 0.1, 0.5, 0.5], function(err, res) {
      h.driver.elementByTagName("textview", function(err, el) {
        el.text(function(err, text) {
          should.not.exist(err);
          _s.trim(text).should.eql("Now is the time for all good developers to come to serve their country.\n\nNow is the time for all good developers to come to serve their country.");
          done();
        });
      });
    });
  });
});
