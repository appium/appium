"use strict";

var setup = require("../../../common/setup-base");

describe('uicatalog - load zipped app with relative path @skip-ios6', function () {
  var driver;
  var appZip = "assets/UICatalog6.0.app.zip";
  setup(this, {app: appZip})
    .then(function (d) { driver = d; });

  it('should load a zipped app via path', function (done) {
    driver.elementByClassName('UIATableView')
      .should.eventually.exist
    .nodeify(done);
  });
});
