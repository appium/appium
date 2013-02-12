/*global it:true*/
"use strict";

var should = require("should")
  , path = require('path')
  , describeWd = require("../../helpers/driverblock.js").describe
  , appUrl = 'http://appium.s3.amazonaws.com/UICatalog.app.zip'
  , appZip = path.resolve(__dirname, "../../../assets/UICatalog.app.zip")
  , describeZip = require('../../helpers/driverblock.js').describeForApp(appZip)
  , describeUrl = require('../../helpers/driverblock.js').describeForApp(appUrl);

describeWd('appium', function(h) {
  it('should fail gracefully after timeout', function(done) {
    var doSomething = function() {
      h.driver.elementsByTagName('textField', function(err) {
        should.exist(err);
        done();
      });
    };
    setTimeout(doSomething, 8000);
  });
}, undefined, undefined, undefined, {newCommandTimeout: 4});

describeWd('appium', function(h) {
  it('should be available after previous timeout', function(done) {
    h.driver.elementsByTagName('textField', function(err) {
      should.not.exist(err);
      done();
    });
  });
}, undefined, undefined, undefined, {newCommandTimeout: 60});

describeZip('appium', function(h) {
  it('should load a zipped app via path', function(done) {
    h.driver.elementByTagName('tableView', function(err, element) {
      should.exist(element.value);
      element.elementByTagName('tableCell', function(err, el2) {
        should.exist(el2.value);
        el2.elementByTagName('staticText', function(err, el3) {
          should.exist(el3.value);
          el3.text(function(err, text) {
            text.should.equal("Buttons, Various uses of UIButton");
            done();
          });
        });
      });
    });
  });
});

describeUrl('appium', function(h) {
  it('should load a zipped app via url', function(done) {
    h.driver.elementByTagName('tableView', function(err, element) {
      should.exist(element.value);
      element.elementByTagName('tableCell', function(err, el2) {
        should.exist(el2.value);
        el2.elementByTagName('staticText', function(err, el3) {
          should.exist(el3.value);
          el3.text(function(err, text) {
            text.should.equal("Buttons, Various uses of UIButton");
            done();
          });
        });
      });
    });
  });
});

describeWd('appium', function(h) {
  it('should go back to using app from before', function(done) {
    h.driver.elementsByTagName('tableView', function(err, elements) {
      should.not.exist(err);
      elements = elements.should.be.empty;
      done();
    });
  });
});
