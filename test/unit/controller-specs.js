"use strict";

var controller = require('../../lib/server/controller.js')
  , chai = require('chai')
  , should = chai.should
  , loggerjs = require('../../lib/server/logger')
  , logger = loggerjs.get('appium')
  , sinon = require('sinon');

describe('Controller', function () {
  describe('##mobileSource', function () {
    beforeEach(function () {
      sinon.spy(logger, 'warn');
    });
    afterEach(function () {
      logger.warn.restore();
    });
    it('should log a deprecation warning', function () {
      var req = {
        body: {
          type: ''
        },
        device: {
          getPageSource: function () {}
        }
      };

      var expected_error = "[DEPRECATED] The type parameter has " +
                           "been deprecated and will be removed.";

      var response = {};
      controller.mobileSource(req, response);
      logger.warn.args[0][0].should.equal(expected_error);
    });
  });
  describe('##getPageSource', function () {
    beforeEach(function () {
      sinon.spy(logger, 'warn');
    });
    afterEach(function () {
      logger.warn.restore();
    });
    it('should log a warning about imminent return type change', function () {
      var req = {
        device: {
          getPageSource: function () {}
        }
      };
      var res = {};
      var message = "This method will change to return XML in a future " +
                    "version of Appium.";
      controller.getPageSource(req, res);
      logger.warn.args[0][0].should.equal(message);
    });
  });
});