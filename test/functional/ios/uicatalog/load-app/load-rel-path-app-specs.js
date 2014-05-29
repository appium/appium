"use strict";

var setup = require("../../../common/setup-base")
  , desired = require('../desired')
  , path = require('path')
  , _ = require('underscore');

describe('uicatalog - load app with relative path @skip-ios6', function () {
  var driver;
  var appPath = path.relative(process.cwd(), desired.app);
  setup(this, _.defaults({'app': appPath}, desired))
    .then(function (d) { driver = d; });

  it('should load with relative path', function (done) {
    driver.elementByClassName('UIATableView')
      .should.eventually.exist
    .nodeify(done);
  });
});
