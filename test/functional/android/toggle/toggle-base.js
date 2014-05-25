"use strict";

exports.toggleTest = function (promisedBrowser, displayName, toggleElementName, toggleMethod) {
  var driver;
  promisedBrowser.then(function (d) { driver = d; });

  var initialValue;
  it('should toggle ' + displayName, function (done) {
    driver
      .elementByName(toggleElementName).text().then(function (txt) {
        initialValue = txt;
        return driver[toggleMethod]();
      })
      .then(function () {
        return driver.elementByName(toggleElementName).text().then(function (txt) {
          txt.should.equal(initialValue === "ON" ? "OFF" : "ON");
        });
      })
      .nodeify(done);
  });

  it('should toggle ' + displayName + ' back to initial value', function (done) {
    driver[toggleMethod]()
      .then(function () {
        return driver.elementByName(toggleElementName).text().then(function (txt) {
          txt.should.equal(initialValue);
        });
      })
      .nodeify(done);
  });
};
