"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require('../desired')
  , path = require('path')
  , _ = require('underscore');

describe('uicatalog - basic', function () {

  describe('load app with absolute path @skip-ios6', function () {
    var driver;
    var appPath = path.resolve(env.SAUCE? '/Users/chef/appium' : process.cwd(), desired.app);
    setup(this, _.defaults({'app': appPath}, desired))
      .then(function (d) { driver = d; });

    it('should load with absolute path', function (done) {
      driver.elementByClassName('UIATableView')
        .should.eventually.exist
      .nodeify(done);
    });
  });

});
