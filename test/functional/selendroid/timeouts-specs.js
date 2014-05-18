"use strict";

var setup = require("../common/setup-base")
  , Q = require("q")
  , _ = require('underscore')
  , desired = require('./desired');

describe('timeouts', function () {

  describe('short commands', function () {
    var driver;
    setup(this, _.defaults({newCommandTimeout: 3}, desired))
     .then(function (d) { driver = d; });

    it('should die with short timeout', function (done) {
      driver
        .sleep(5000)
        .elementByName('Animation')
          .should.be.rejectedWith(/(status: (13|6))|(Not JSON response)/)
        .nodeify(done);
    });
  });

  describe('command coming in', function () {
    var driver;
    setup(this, _.defaults({newCommandTimeout: 3}, desired))
     .then(function (d) { driver = d; });

    it('should not die if commands come in', function (done) {
      var start = Date.now();
      var find = function () {
        if ((Date.now() - start) < 5000) {
          return driver
            .elementByName('Animation').should.eventually.exist
            .sleep(500)
            .then(find);
        } else return new Q();
      };
      find().nodeify(done);
    });
  });

});
