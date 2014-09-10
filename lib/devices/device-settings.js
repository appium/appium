"use strict";

var SUCCESS_CODE = require('../server/status.js').codes.Success.code;

// private container that encapsulates settings; declare default values here
var _settings = {'ignoreUnimportantViews': false};

// Ctor
var DeviceSettings = function () { };

// Setting this delegate allows a listener to hook property changes.
// Delegate signature: func (propName, value, cb) { ... }
DeviceSettings.prototype.onPropertyChanged = null;

// Sets error, 'value', and 'status' data and returns it via client callback
var _doCallback = function (val, err, cb) {
  // assert(cb);
  if (err) {
    return cb(err);
  }

  return cb(null, {
    status: SUCCESS_CODE
    , value: val
  });
};

// Set the settings collection asynchronously and invoke the cb when all operations complete
DeviceSettings.prototype.set = function (newSettings, cb) {

  // remaining async operations to complete
  var remainingOperations = 0;
  // the first error encountered; could handle multiple error msgs if needed
  var delegateErr = null;

  var onComplete = function (err) {
    if (err && !delegateErr) {
      delegateErr = err;
    }

    if (--remainingOperations === 0) {
      _doCallback(null, delegateErr, cb);
    }
  };

  for (var propName in newSettings) {
    var propertyChanged = _settings[propName] !== newSettings[propName];
    _settings[propName] = newSettings[propName];

    // if a property has changed and there is a listener, notify the listener
    if (propertyChanged && this.onPropertyChanged) {
      ++remainingOperations;
      this.onPropertyChanged(propName, _settings[propName], onComplete);
    }
  }

  if (remainingOperations === 0) {
    // no changes were required
    _doCallback(null, null, cb);
  }
};

// Get the setting collection via callback
DeviceSettings.prototype.get = function (cb) {
  _doCallback(_settings, null, cb);
};

// Get a single setting
DeviceSettings.prototype.getSetting = function (settingName) {
  return _settings[settingName];
};

module.exports = DeviceSettings;
