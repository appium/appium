"use strict";

exports.toggleTest = function (promisedBrowser, displayName, toggleElementName, toggleMethod) {
  var driver;
  promisedBrowser.then(function (d) { driver = d; });

  var initialValue;
  it('should toggle ' + displayName, function (done) {
    var on = 'ON';
    var off = 'OFF';
    driver
      .elementByName(toggleElementName).text().then(function (txt) {
        initialValue = txt;
        // make sure we have the right values
        if (txt === 'OUI' || txt === 'NON') {
          on = 'OUI';
          off = 'NON';
        }
        return driver[toggleMethod]();
      })
      .then(function () {
        return driver.elementByName(toggleElementName).text().then(function (txt) {
          txt.should.equal(initialValue === on ? off : on);
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
