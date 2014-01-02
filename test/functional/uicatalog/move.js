"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , it = require("../../helpers/driverblock.js").it;

describeWd('moveTo and click', function(h) {
  it('should be able to click on arbitrary x-y elements', function(done) {
    h.driver
      .elementByTagName('tableCell').moveTo(10, 10).click()
      .elementByXPath("button[@name='Rounded']")
        .should.eventually.exist
      .nodeify(done);
  });
});
