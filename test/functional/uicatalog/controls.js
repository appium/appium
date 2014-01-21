"use strict";

var env = require('../../helpers/env')
  , setup = require('./setup');

describe('execute', function() {
  var browser;
  setup(this).then( function(_browser) { browser = _browser; } );

  if (env.FAST_TESTS) {
    beforeEach(function(done) {
      browser
        .elementByNameOrNull('Back')
        .then(function(el) { if (el) return el.click(); })
        .nodeify(done);
    });
  }
  
  it('should be able to get and set a picker value', function(done) {
    browser
      .elementByXPath("//text[contains(@label,'Pickers')]").click()
      .elementsByTagName("picker").then(function(els) { return els[2]; })
      .elementByTagName('>', "pickerwheel").then(function(wheel) {
        return wheel
          .getAttribute("values").then(function(values) { return values[1]; })
            .should.become("Chris Armstrong")
          .then(function() {
            return wheel.type("Serena Auroux")
              .getAttribute("value").should.become("Serena Auroux. 3 of 7");
          });
      }).nodeify(done);
  });

  it('should be able to get and set a slider value', function(done) {
    browser
      .elementByXPath("//text[contains(@label,'Controls')]").click()
      .elementByTagName("slider").then(function(slider) {
        return slider
          .getAttribute("value").should.become('50%')
          .then(function() {
            return slider.sendKeys(0.8).getAttribute("value")
              .should.become('80%');
          });
      }).nodeify(done);
  });

});
