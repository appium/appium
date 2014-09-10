"use strict";

var _ = require('underscore')
  , getSimUdid = require('../../../helpers/sim-udid').getSimUdid;

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

var ios7up = function (version, udid, setting, expected, cb) {
  var settingsSets;
  var foundSettings;
  try {
    var settingsPlists = require('../../../../lib/devices/ios/settings.js');
    settingsSets = settingsPlists.getSettings(version, udid, 'mobileSafari');
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

exports.ios7up = function (desired, setting, expected, cb) {
  if (parseFloat(desired.platformVersion) >= 8) {
    getSimUdid('6', desired, function (err, udid) {
      if (err) return cb(err);
      ios7up(desired.platformVersion, udid, setting, expected, cb);
    });
  } else {
    ios7up(desired.platformVersion, null, setting, expected, cb);
  }
};
