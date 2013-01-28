/*global it:true*/
"use strict";

var should = require("should")
  , request = require('request')
  , describeWd = require("../../helpers/driverblock.js").describe
  , appUrl = 'https://raw.github.com/appium/appium/master/assets/UICatalog.app.zip'
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

describeUrl('appium', function(h) {
  it('should load a zipped app via url', function(done) {
    h.driver.elementByTagName('tableView', function(err, element) {
      should.exist(element.value);
      element.elementByTagName('tableCell', function(err, label) {
        should.exist(label.value);
        label.text(function(err, text) {
          text.should.equal("Buttons, Various uses of UIButton");
          done();
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

describeWd('appium', function(h) {
  it('should not fail when bad paths requested', function(done) {
    request('http://localhost:4723/a/bad/path', function(error, response, body) {
      should.not.exist(error);
      response.statusCode.should.equal(200);
      JSON.parse(body).status.code.should.equal(9);
      done();
    });
  });
  it('should not fail when bad method used', function(done) {
    request.get('http://localhost:4723/wd/hub/session/'+h.sessionId+'/element', function(err, res, body) {
      should.not.exist(err);
      res.statusCode.should.equal(200);
      JSON.parse(body).status.code.should.equal(9);
      done();
    });
  });
});
