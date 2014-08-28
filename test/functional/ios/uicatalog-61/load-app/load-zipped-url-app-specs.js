"use strict";

var setup = require("../../../common/setup-base");

describe('uicatalog - basic @skip-ios7up', function () {

  describe('load zipped app via url', function () {
    var driver;
    var appUrl = 'http://appium.s3.amazonaws.com/UICatalog6.0.app.zip';
    setup(this, {app: appUrl})
      .then(function (d) { driver = d; });

    it('should load a zipped app via url', function (done) {
      driver
        .elementByClassName('UIATableView')
          .should.eventually.exist
        .nodeify(done);
    });
  });

});
