"use strict";
var _ = require('underscore')
  , warnDeprecated = require('../helpers.js').logDeprecationWarning;

var capsConversion = {
  'device': 'platformName',
  'version': 'platformVersion'
};

var Capabilities = function (capabilities) {
  this.desired = capabilities;
  this.warnings = {};

  _.each(capabilities, function (cap, name) {
    if (_.contains(_.keys(capsConversion), name)) {
      warnDeprecated('capability', name, capsConversion[name]);
    }
    // Hacky alias for version
    if (name.indexOf('platformVersion') !== -1) {
      this.version = cap;
    }
    this[name] = cap;
  }, this);
};

module.exports = Capabilities;