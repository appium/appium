"use strict";
var _ = require('underscore')
  , logger = require('./logger.js').get('appium')
  , warnDeprecated = require('../helpers.js').logDeprecationWarning;

var capsConversion = {
  'launch': 'autoLaunch'
};

var okObjects = [
  'proxy',
  'launchTimeout'
];

var requiredCaps = [
  'platformName'
, 'platformVersion'
, 'deviceName'
];

var generalCaps = requiredCaps.concat([
  'automationName'
, 'app'
, 'browserName'
, 'newCommandTimeout'
, 'autoLaunch'
, 'language'
, 'locale'
, 'udid'
, 'orientation'
]);

var androidCaps = [
  'appActivity'
, 'appPackage'
, 'appWaitActivity'
, 'appWaitPackage'
, 'deviceReadyTimeout'
, 'androidCoverage'
, 'enablePerformanceLogging'
, 'avdLaunchTimeout'
, 'avdReadyTimeout'
, 'avd'
, 'avdArgs'
, 'useKeystore'
, 'keystorePath'
, 'keystorePassword'
, 'keyAlias'
, 'keyPassword'
];

var iosCaps = [
  'calendarFormat'
, 'bundleId'
, 'launchTimeout'
, 'locationServicesEnabled'
, 'locationServicesAuthorized'
, 'autoAcceptAlerts'
, 'nativeInstrumentsLib'
, 'nativeWebTap'
, 'safariAllowPopups'
, 'safariIgnoreFraudWarning'
, 'safariOpenLinksInBackground'
, 'keepKeyChains'
, 'localizableStringsDir'
];

var Capabilities = function (capabilities) {
  this.warnings = {};
  this.setDesired(capabilities);
};

Capabilities.prototype.setDesired = function (caps) {
  caps = _.clone(caps);
  _.each(caps, function (value, cap) {
    if (!_.contains(okObjects, cap) &&
        typeof value === "object" &&
        value !== null) {
      logger.warn("Converting cap " + cap + " to string, since it was an " +
                  "object. This might be a user error. Original value was: " +
                  JSON.stringify(value));
      caps[cap] = JSON.stringify(value);
    }
  });
  _.each(caps, function (value, cap) {
    if (_.contains(_.keys(capsConversion), cap)) {
      warnDeprecated('capability', cap, capsConversion[cap]);
      caps[capsConversion[cap]] = value;
      delete caps[cap];
    }
  });
  this.desired = caps;
  _.each(caps, function (value, cap) {
    this[cap] = value;
  }, this);
};

Capabilities.prototype.checkStrictValidity = function (deviceType) {
  if (_.contains(["firefoxos", "selendroid"], deviceType)) {
    logger.info("Not checking cap validity because we're proxying all caps " +
                "to " + deviceType);
    return;
  }

  logger.info("Checking caps according to strict mode");

  var e = function (msg) { throw new Error(msg); };

  var allValidCaps = [].concat(generalCaps, androidCaps, iosCaps);
  var capsUsed = _.keys(this.desired);
  var unknownCaps = _.difference(capsUsed, allValidCaps);
  if (unknownCaps.length > 0) {
    return e("Appium does not know about these desired capabilities: " +
             JSON.stringify(unknownCaps) + ". Please remove unknown caps");
  }

  var forgottenRequiredCaps = _.difference(requiredCaps, capsUsed);
  if (forgottenRequiredCaps.length > 0) {
    return e("Appium requires the following caps to be passed in: " +
             JSON.stringify(forgottenRequiredCaps));
  }

  if (_.difference(['app', 'browserName'], capsUsed).length > 1) {
    return e("You must pass in either the 'app' or 'browserName' cap");
  }

  var validDeviceCaps = _.clone(generalCaps);
  if (_.contains(["safari", "ios"], deviceType)) {
    validDeviceCaps = validDeviceCaps.concat(iosCaps);
  } else if (_.contains(["chrome", "android"], deviceType)) {
    validDeviceCaps = validDeviceCaps.concat(androidCaps);
  }

  var unknownDeviceCaps = _.difference(capsUsed, validDeviceCaps);
  if (unknownDeviceCaps.length > 0) {
    return e("These capabilities are not valid for your device: " +
             JSON.stringify(unknownDeviceCaps) + ". Please remove them");
  }

};

Capabilities.capabilityConversions = capsConversion;

module.exports = Capabilities;
