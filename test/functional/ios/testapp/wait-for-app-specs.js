// This is basically a port of webdriver-test.py
// https://github.com/hugs/appium/blob/master/sample-code/webdriver-test.py
"use strict";

var setup = require("../../common/setup-base")
  , desired = require('./desired')
  , _ = require('underscore');

describe('testapp - wait-for-apps', function () {

  var test = function (desc, script, checkAfter) {
    script = 'env.currentTest = "' + desc + '"; ' + script;
    describe(desc, function () {
      var driver;
      setup(this, _.defaults({waitForAppScript: script}, desired))
        .then(function (d) { driver = d; });

      it('should work', function (done) {
        driver
          .waitForElementByClassName('UIAButton')
            .should.eventually.exist
          .then(function () {
            if (checkAfter) {
              return driver
                .execute('env.currentTest')
                .should.become(desc);
            }
          })
         .nodeify(done);
      });
    });
  };

  test('just waiting', '$.delay(5000); true;', true);
  test('waiting for one element', 'target.elements().length > 0;', true);
  test('bad script', 'blagimarg!!;', false);
});

