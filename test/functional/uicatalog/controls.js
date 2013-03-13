
/*global it:true */
"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , should = require("should");

describeWd('execute', function(h) {
  it('should be able to get and set a picker value', function(done) {
    h.driver.elementByXPath("//text[contains(@label,'Pickers')]", function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.elementsByTagName("picker", function(err, pickers) {
          should.not.exist(err);
          pickers[2].elementsByTagName("pickerwheel", function(err, wheels) {
            should.not.exist(err);
            wheels[0].getAttribute("values", function(err, values) {
              should.not.exist(err);
              values[1].should.eql("Chris Armstrong");
              wheels[0].type("Serena Auroux", function(err) {
                should.not.exist(err);
                wheels[0].getAttribute("value", function(err, value) {
                  should.not.exist(err);
                  value.should.eql("Serena Auroux. 3 of 7");
                  done();
                });
              });
            });
          });
        });
      });
    });
  });
});
