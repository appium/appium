"use strict";

var setup = require("./setup-base")
    , env = require('../../helpers/env')
    , getAppPath = require('../../helpers/app').getAppPath;

var app;
if (env.IOS) {
  app = 'testapp';
} else if (env.ANDROID || env.SELENDROID) {
  app = 'ApiDemos';
}

var desired = {
  app: getAppPath(app)
};

if (env.SELENDROID) {
  desired.automationName = 'selendroid';
}

describe('settings', function () {
  var driver;
  setup(this, desired, {'no-reset': true}).then(function (d) { driver = d; });

  it('should return a settings object even if none specified', function (done) {
    driver
      .settings().should.eventually.exist
      .nodeify(done);
  });

  it('should be able to store a setting', function (done) {
    driver
      .updateSettings({'settlers of': 'Catan'})
      .settings().should.eventually.have.property('settlers of')
      .nodeify(done);
  });

  it('should overwrite new settings', function (done) {
    driver
      .updateSettings({'settlers of': 'Catan'})
      .updateSettings({'settlers of': 'Europa'})
      .settings().then(function (settings) {
        return settings['settlers of'].should.equal('Europa');
      })
      .nodeify(done);
  });

  it('should leave non-specified settings unchanged', function (done) {
    driver
      .updateSettings({'thing one': 1})
      .updateSettings({'thing two': 2})
      .settings().should.eventually.have.property('thing one')
      .nodeify(done);
  });

});
