"use strict";

var setup = require("../../../common/setup-base")
  , desired = require('../desired');

describe('uicatalog - gestures - scroll to el @skip-ios7 @skip-ios6', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should bring the element into view', function (done) {
    var el, scrollOpts, location1;
    driver.elementsByClassName('UIATableCell').then(function (els) {
      el = els[10];
      scrollOpts = { element: el.value };
    })
    .then(function () { return el.getLocationInView(); })
    .then(function (loc) { location1 = loc; })
    .then(function () {
      return driver.execute("mobile: scrollTo", [scrollOpts]);
    }).then(function () { return el.getLocationInView(); })
    .then(function (location2) {
      location2.x.should.equal(location1.x);
      location2.y.should.not.equal(location1.y);
    }).nodeify(done);
  });
});

