"use strict";
var _ = require('underscore')
  , logger = require('./logger.js').get('appium');

var oldCapabilities = [
  'device',
  'version',
  'app-package'
];

var Capabilities = function (capabilities) {
  this.desired = capabilities;
  this.warnings = {};

  _.each(capabilities, function (cap, name) {
    if (_.contains(oldCapabilities, name)) {
      this.warnOnlyOnceForDeprecation(name);
    }
    // Hacky alias for version
    if (name.indexOf('platformVersion') !== -1) {
      this.version = cap;
    }
    this[name] = cap;
  }, this);
};

Capabilities.prototype.warnOnlyOnceForDeprecation = function (capability) {
  if (!this.warnings[capability]) {
    this.warnings[capability] = true;
    logger.warn("[DEPRECATED] The '" + capability + "' capability is " +
    "deprecated, and will be removed in Appium 1.0");
  }
};

module.exports = Capabilities;