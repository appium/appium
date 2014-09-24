"use strict";

var setup = require("../../common/setup-base")
  , desired = require("./desired");

describe("uicatalog - stability @skip-ci @skip-ios6", function () {

  var runs = 20;

  var test = function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should complete successfully', function (done) {
      driver
        .elementByClassName('UIATableView')
        .nodeify(done);
    });
  };

  for (var n = 0; n < runs; n++) {
    describe('burn-in test ' + n, test);
  }
});


