"use strict";

var EventEmitter = require('events').EventEmitter
  , CamelBackPromise = require('camel-back-promise') // The straw that breaks the camels back. Instantiate by passing in a deferred promise and a number n. After the CamelBackPromise is called n times, the deferred promise is resolved.
  , _ = require('underscore')
  , Q = require('q')
  ;

// EventEmitter which emits an 'update' event every time a setting is changed. One call to "updateSettings" could trigger multiple update events.
// The value of the event is a tuple: {key, value, oldValue, callback}.
// Any listeners *MUST* call the function stored in 'callback' to tell the appium server that it it can continue to take commands. This is to prevent race conditions between enabling a setting and calling the next command.
// `callback` is a node-style callback, so passing an argument will cause the updateSettings command to throw an error. Note that the setting still gets changed, even if the subscriber doesn't affect the change. It's up to the client to resolve this case.
var DeviceSettings = function () {
  this.init();
};

_.extend(DeviceSettings.prototype, EventEmitter.prototype);

DeviceSettings.prototype.init = function () {

  this._settings = {};

  // this is where default settings can be declared
  this._settings.ignoreUnimportantViews = false;
};

DeviceSettings.prototype.update = function (newSettings, cb) {
  // if this code looks familiar, it's because it's modified from the underscore.js implementation of `extend`
  if (!_.isObject(newSettings)) {
    cb();
  }
  var numListeners = this.listeners("update").length;

  var prop;
  var pendingUpdates = [];

  for (prop in newSettings) {
    if (hasOwnProperty.call(newSettings, prop)) {
      var deferred = Q.defer();
      pendingUpdates.push(deferred.promise);

      var updatePayload = {
        key: prop,
        value: newSettings[prop],
        oldValue: this._settings[prop],
        callback: new CamelBackPromise(deferred, numListeners)
      };

      this._settings[prop] = newSettings[prop];
      this.emit("update", updatePayload);
    }
  }

  Q.all(pendingUpdates).then(
    function () {
      return cb();
    },
    function (err) {
      return cb(err);
    }
  );
};

module.exports = DeviceSettings;
