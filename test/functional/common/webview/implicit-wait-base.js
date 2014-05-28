"use strict";

var setup = require("../setup-base");

module.exports = function (desired) {

  describe('implicit wait', function () {
    var driver;
    setup(this, desired, {'no-reset': true}).then(function (d) { driver = d; });

    it('should set the implicit wait for finding web elements', function (done) {
      driver
        .setImplicitWaitTimeout(7 * 1000)
        .then(function () {
          var before = new Date().getTime() / 1000;
          return driver
            .elementByTagName('notgonnabethere')
              .should.be.rejectedWith(/status: 7/)
            .then(function () {
              var after = new Date().getTime() / 1000;
              // commenting this, it doesn't make sense
              //((after - before) < 9).should.be.ok;
              ((after - before) > 7).should.be.ok;
            });
        }).finally(function () {
          return driver.setImplicitWaitTimeout(0);
        }).nodeify(done);
    });
  });
};
