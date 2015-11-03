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
    setup(this, _.defaults({language: 'fr'}, desired)).then(function (d) { driver = d; });

    it('should contain fr', function (done) {
      // iOS 9+ returns 'fr-US', earlier iOS versions return 'fr'
      driver.execute('$.mainApp().preferencesValueForKey("AppleLanguages")[0];')
        .should.eventually.contain('fr')
        .nodeify(done);
    });
  });

  describe('changing to de', function () {
    var driver;
    setup(this, _.defaults({language: 'de'}, desired)).then(function (d) { driver = d; });

    it('should contain de', function (done) {
      // iOS 9+ returns 'de-US', earlier iOS versions return 'de'
      driver.execute('$.mainApp().preferencesValueForKey("AppleLanguages")[0];')
        .should.eventually.contain('de')
        .nodeify(done);
    });
  });

});
