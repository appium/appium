"use strict";

var describeWd = require("../../helpers/driverblock.js").describeForApp('TestApp')
  , it = require("../../helpers/driverblock.js").it;

describeWd('check location', function(h) {
  it('should return the right x/y coordinates', function(done) {
    h.driver
      .elementByTagName('button').getLocation().then(function(location) {
        location.x.should.equal(94);
        location.y.should.equal(122);
      })
      .nodeify(done);
  });

  it('should not error with valid lat/lon and no options', function(done) {
    var locationOpts = {
      latitude: -30
      , longitude: 30
    };
    h.driver.execute('mobile: setLocation', [locationOpts])
      .nodeify(done);
  });

  it('should not error with valid lat/lon and valid options', function(done) {
    var locationOpts = {
      latitude: -30
      , longitude: 30
      , altitude: 1000
    };
    h.driver.execute('mobile: setLocation', [locationOpts])
      .nodeify(done);
  });

  it('should error with invalid lat/lon and no options', function(done) {
    var locationOpts = {
      latitude: -150
      , longitude: 30
    };
    h.driver.execute('mobile: setLocation', [locationOpts])
      .should.be.rejected
      .nodeify(done);
  });
});
