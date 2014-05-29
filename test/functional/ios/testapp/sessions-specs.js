// todo: rewrite this using wd.sessions
"use strict";

var env = require('../../../helpers/env')
  , setup = require("../../common/setup-base")
  , desired = require('./desired')
  , request = require("request");

describe('testapp - sessions', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  // sessions is disabled on sauce
  it('should return appear in the sessions returned @skip-ci', function (done) {
    request({
        url: "http://localhost:" + env.APPIUM_PORT + "/wd/hub/sessions"
      , method: "GET"
      , json: true
      }, function (err, response, body) {
        driver.sessionID.should.equal(body.value[0].id);
        done();
      });
  });
});
