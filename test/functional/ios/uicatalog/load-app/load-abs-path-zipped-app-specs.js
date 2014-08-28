"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , path = require('path');

describe('uicatalog - load zipped app @skip-ios6', function () {
  var driver;
  var appZip = path.resolve(env.SAUCE ? '/Users/chef/appium' : process.cwd(), 'assets/UICatalog7.1.app.zip');
  setup(this, {app: appZip})
    .then(function (d) { driver = d; });

  it('should load a zipped app via path', function (done) {
    driver.elementByClassName('UIATableView')
      .should.eventually.exist
    .nodeify(done);
  });
});
