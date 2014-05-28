"use strict";

var _ = require('underscore');

exports.ios6 = function (driver, setting, expected, cb) {
  driver
    .elementsByClassName("UIATableCell")
    .then(function (els) { return els[4].click(); })
    .then(function () {
      if (setting === 'fraud') {
        return driver.elementByName("Fraud Warning");
      } else if (setting === 'popups') {
        return driver.elementByName("Block Pop-ups");
      } else {
        return new Error("Bad setting " + setting);
      }
    })
    .getValue().then(function (checked) {
      (!!parseInt(checked, 10)).should.eql(!!expected);
    }).nodeify(cb);
};

exports.ios7 = function (setting, expected, cb) {
  var settingsSets;
  var foundSettings;
  try {
    var settingsPlists = require('../../../../lib/devices/ios/settings.js');
    settingsSets = settingsPlists.getSettings('7', 'mobileSafari');
  } catch (e) {
    return cb(e);
  }
  _.size(settingsSets).should.be.above(0);
  for (var i = 0; i < settingsSets.length; i++) {
    try {
      foundSettings.push(settingsSets[i][setting]);
    } catch (e) {
      return cb(e);
    }
  }
  if (settingsSets.length > 0) {
    console.log("More than one safari settings set found, a failure here " +
                "might not be accurate");
  }
  for (i = 0; i < settingsSets.length; i++) {
    foundSettings[i].should.eql(expected);
  }
  cb();
};
