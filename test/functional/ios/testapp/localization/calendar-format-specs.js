"use strict";

var env = require('../../../../helpers/env'),
    setup = require("../../../common/setup-base"),
    desired = require('../desired'),
    _ = require('underscore'),
    rimraf = require('rimraf'),
    path = require('path');

describe('localization - calendarFormat @skip-ios8', function () {
  this.timeout(env.MOCHA_INIT_TIMEOUT);

  after(function () {
    if (process.env.HOME) {
      // cleaning up dir cause we've messed up with the config
      rimraf.sync(path.resolve(process.env.HOME, 'Library/Application Support/iPhone Simulator'));
    }
  });

  describe('changing to gregorian calendar', function () {
    var driver;
    setup(this, _.defaults({calendarFormat: 'gregorian'}, desired)).then(function (d) { driver = d; });

    it('should have gregorian calendar format', function (done) {
      driver.execute('$.mainApp().preferencesValueForKey("AppleLocale");')
        .should.eventually.include('@calendar=gregorian')
        .nodeify(done);
    });
  });

  describe('changing to buddhist calendar', function () {
    var driver;
    setup(this, _.defaults({calendarFormat: 'buddhist'}, desired)).then(function (d) { driver = d; });

    it('should have buddhist calendar format', function (done) {
      driver.execute('$.mainApp().preferencesValueForKey("AppleLocale");')
        .should.eventually.include('@calendar=buddhist')
        .nodeify(done);
    });
  });

});
