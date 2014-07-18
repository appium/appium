"use strict";

var env = require('../../../../helpers/env'),
    setup = require("../../../common/setup-base"),
    desired = require('../desired'),
    _ = require('underscore'),
    rimraf = require('rimraf'),
    path = require('path');

describe('localization - language', function () {
  this.timeout(env.MOCHA_INIT_TIMEOUT);

  after(function () {
    if (process.env.HOME) {
      // cleaning up dir cause we've messed up with the config
      rimraf.sync(path.resolve(process.env.HOME, 'Library/Application Support/iPhone Simulator'));
    }
  });

  describe('changing to fr', function () {
    var driver;
    setup(this, _.defaults({language: 'fr'} , desired)).then(function (d) { driver = d; });

    it('should be fr', function (done) {
      driver.execute('$.mainApp().preferencesValueForKey("AppleLanguages")[0];')
        .should.become('fr')
        .nodeify(done);
    });
  });

  describe('changing to de', function () {
    var driver;
    setup(this, _.defaults({language: 'de'} , desired)).then(function (d) { driver = d; });

    it('should be de', function (done) {
      driver.execute('$.mainApp().preferencesValueForKey("AppleLanguages")[0];')
        .should.become('de')
        .nodeify(done);
    });
  });

});
