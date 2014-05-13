"use strict";

var setup = require("../../common/setup-base")
  , desired = require('./desired')
  , _ = require('underscore');

describe('webview - orientation', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  var testOrientation = function (specOrientation) {
    it('should get and set - ' + specOrientation, function (done) {
      driver
        .setOrientation(specOrientation)
        .getOrientation().should.become(specOrientation)
        .nodeify(done);
    });
  };
  _.each(["LANDSCAPE", "PORTRAIT"], testOrientation);
});
