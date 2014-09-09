"use strict";

var env = require('../../../../helpers/env'),
    setup = require("../../../common/setup-base"),
    desired = require('../desired'),
    _ = require('underscore'),
    rimraf = require('rimraf'),
    path = require('path');

describe('localization - locale @skip-ios8', function () {
  this.timeout(env.MOCHA_INIT_TIMEOUT);

  after(function () {
    if (process.env.HOME) {
      // cleaning up dir cause we've messed up with the config
      rimraf.sync(path.resolve(process.env.HOME, 'Library/Application Support/iPhone Simulator'));
    }
  });
  describe('default locale', function () {
    var driver;
    setup(this, desired).then(function (d) { driver = d; });

    it('should be english', function (done) {
      driver.execute('$.mainApp().preferencesValueForKey("AppleLocale");')
        .should.become('en_US')
        .nodeify(done);
    });
  });

  describe('changing locale', function () {
    var driver;
    setup(this, _.defaults({locale: 'fr'}, desired)).then(function (d) { driver = d; });

    it('should be fr', function (done) {
      driver.execute('$.mainApp().preferencesValueForKey("AppleLocale");')
        .should.become('fr')
        .nodeify(done);
    });
  });

  describe('changing back', function () {
    var driver;
    setup(this, _.defaults({locale: 'en_US'}, desired)).then(function (d) { driver = d; });

    it('should be en', function (done) {
      driver.execute('$.mainApp().preferencesValueForKey("AppleLocale");')
        .should.become('en_US')
        .nodeify(done);
    });
  });

});
