"use strict";

var setup = require("../common/setup-base")
  , _ = require('underscore')
  , desired = require('./desired');

describe('selendroid -- shutdown', function () {
  describe('fullReset false', function () {
    var driver;
    setup(this, _.defaults({
      fullReset: false
    }, desired)).then(function (d) { driver = d; });

    it('should successfully stop', function (done) {
      driver
        .quit()
          .should.not.be.rejected
        .nodeify(done);
    });
  });

  describe('fullReset true', function () {
    var driver;
    setup(this, _.defaults({
      fullReset: true
    }, desired)).then(function (d) { driver = d; });

    it('should successfully stop', function (done) {
      driver
        .quit()
          .should.not.be.rejected
        .nodeify(done);
    });
  });
});
