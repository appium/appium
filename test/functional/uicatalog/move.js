/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , should = require("should");

describeWd('moveTo and click', function(h) {
  it('should be able to click on arbitrary x-y elements', function(done) {
    h.driver.elementsByTagName('tableCell', function(err, els) {
      should.not.exist(err);
      h.driver.moveTo(els[0], 10, 10, function(err) {
        should.not.exist(err);
        h.driver.click(function(err) {
          should.not.exist(err);
          h.driver.elementByXPath("button[@name='Rounded']", function(err, el) {
            should.not.exist(err);
            should.exist(el.value);
            done();
          });
        });
      });
    });
  });
});
