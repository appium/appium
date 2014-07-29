"use strict";

var setup = require("../../common/setup-base")
  , desired = require("./desired");

describe("apidemos - stability @skip-ci", function () {

  var runs = 20;

  var test = function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should complete successfully', function (done) {
      driver
        .elementByName('Animation')
        .nodeify(done);
    });
  };

  for (var n = 0; n < runs; n++) {
    describe('burn-in test ' + n, test);
  }
});

