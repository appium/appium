"use strict";

var env = require('../../../../helpers/env')
  , setup = require("../../../common/setup-base")
  , desired = require('../desired');

var SLOW_DOWN_MS = 1000;

describe('uicatalog - gestures - scroll to el @skip-ios7', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  if (env.FAST_TESTS) {
    afterEach(function (done) {
      driver
        .flick(0, 100, false)
        .flick(0, 100, false)
        .sleep(SLOW_DOWN_MS)
        .nodeify(done);
    });
  }

  it('should bring the element into view', function (done) {
    var el, scrollOpts, location1;
    driver.elementsByClassName('UIATableCell').then(function (els) {
      el = els[10];
      scrollOpts = { element: el.value };
    })
    .then(function () { return el.getLocation(); })
    .then(function (loc) { location1 = loc; })
    .then(function () {
      return driver.execute("mobile: scrollTo", [scrollOpts]);
    }).then(function () { return el.getLocation(); })
    .then(function (location2) {
      location2.x.should.equal(location1.x);
      location2.y.should.not.equal(location1.y);
    }).nodeify(done);
  });
});

