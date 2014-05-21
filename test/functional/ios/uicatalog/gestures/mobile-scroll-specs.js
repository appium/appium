"use strict";

var setup = require("../../../common/setup-base")
  , desired = require('../desired');

describe('uicatalog - gestures - mobile scroll', function () {
  var driver;
  setup(this, desired).then(function (d) { driver = d; });

  it('should scroll down and up', function (done) {
    var firstEl, location1, location2;
    driver
    .elementByClassName('UIATableCell')
    .then(function (el) { firstEl = el; return el.getLocation(); })
    .then(function (loc) { location1 = loc; })
    .then(function () {
      return driver.execute("mobile: scroll", [{direction: 'down'}]);
    })
    .then(function () { return firstEl.getLocation(); })
    .then(function (loc2) {
      location2 = loc2;
      loc2.x.should.equal(location1.x);
      loc2.y.should.not.equal(location1.y);
    })
    .then(function () {
      return driver.execute("mobile: scroll", [{direction: 'up'}]);
    })
    .then(function () { return firstEl.getLocation(); })
    .then(function (loc3) {
      loc3.x.should.equal(location2.x);
      loc3.y.should.not.equal(location2.y);
    })
    .nodeify(done);
  });
  it('should scroll down and up using element', function (done) {
    var firstEl, location1, location2, table_view;
    driver.elementByClassName('UIATableView').then(function (el) {
      table_view = el;
    })
    .elementByClassName('UIATableCell')
    .then(function (el) { firstEl = el; return el.getLocation(); })
    .then(function (loc) { location1 = loc; })
    .then(function () {
      return driver.execute("mobile: scroll", [{element: table_view.value, direction: 'down'}]);
    })
    .then(function () { return firstEl.getLocation(); })
    .then(function (loc2) {
      location2 = loc2;
      loc2.x.should.equal(location1.x);
      loc2.y.should.not.equal(location1.y);
    })
    .then(function () {
      return driver.execute("mobile: scroll", [{element: table_view.value, direction: 'up'}]);
    })
    .then(function () { return firstEl.getLocation(); })
    .then(function (loc3) {
      loc3.x.should.equal(location2.x);
      loc3.y.should.not.equal(location2.y);
    })
    .nodeify(done);
  });
});

