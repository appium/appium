"use strict";
var _ = require('underscore')
  , logger = require('./logger.js').get('appium')
  , warnDeprecated = require('../helpers.js').logDeprecationWarning;

var capsConversion = {
  'device': 'platformName',
  'version': 'platformVersion'
};

var Capabilities = function (capabilities) {
  this.warnings = {};
  this.setDesired(capabilities);

  _.each(this.desired, function (value, cap) {
    if (_.contains(_.keys(capsConversion), cap)) {
      warnDeprecated('capability', cap, capsConversion[cap]);
    }
    // Hacky alias for version
    if (cap.indexOf('platformVersion') !== -1) {
      this.version = value;
    }
    this[cap] = value;
  }, this);
};

Capabilities.prototype.setDesired = function (caps) {
  _.each(caps, function (value, cap) {
    if (typeof value === "object" && value !== null) {
      logger.warn("Converting cap " + cap + " to string, since it was an " +
                  "object. This might be a user error. Original value was: " +
                  JSON.stringify(value));
      caps[cap] = JSON.stringify(value);
    }
  });
  this.desired = caps;
};

module.exports = Capabilities;
