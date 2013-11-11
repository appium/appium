"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('UICatalog')
  , it = require("../../helpers/driverblock.js").it
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

  it('should be able to get and set a slider value', function(done) {
    h.driver.elementByXPath("//text[contains(@label,'Controls')]", function(err, el) {
      should.not.exist(err);
      el.click(function(err) {
        should.not.exist(err);
        h.driver.elementByTagName("slider", function(err, slider) {
          should.not.exist(err);
          slider.getAttribute("value", function(err, value) {
            should.not.exist(err);
            value.should.eql('50%');
            slider.sendKeys(0.8, function(err) {
              should.not.exist(err);
              slider.getAttribute("value", function(err, value) {
                should.not.exist(err);
                value.should.eql('80%');
                done();
              });
            });
          });
        });
      });
    });
  });
});
