"use strict";

var Android = require('./android.js')
  , Selendroid = require('./selendroid.js')
  , _ = require('underscore')
  , androidCommon = require('./android-common.js')
  ;

var Opera = function (desiredCaps) {

  if (desiredCaps.automationName && desiredCaps.automationName.indexOf('selendroid') !== -1) {
	_.extend(Opera.prototype, Selendroid.prototype);
    Opera.prototype._installAppForTest = Selendroid.prototype.installAppForTest;
  }
  else {
	_.extend(Opera.prototype, Android.prototype);
    Opera.prototype._installAppForTest = androidCommon.installAppForTest;
  }

  Opera.prototype.installAppForTest = function (cb) {
    this._installAppForTest(function (err) {
      if (this.args.autoLaunch === false) {
        cb(err);
      }
      else {
        if (err) return cb(err);
        var deducedCapabilities = getDeducedCapabilities(this.args.appPackage);
        if (!deducedCapabilities) return cb(new Error("Couldn't deduce Opera capabilities for package " + this.args.appPackage));
        this.args.androidDeviceSocket = deducedCapabilities.socket;
        this.adb.shell("echo 'opera --disable-fre --enable-remote-debugging --metrics-recording-only' > /data/local/tmp/" + deducedCapabilities.commandLineFile, cb);
      }
    }.bind(this));
  };
};

operaBase.installAppForTest = function (cb) {
	this
	._installAppForTest(function(err) {
		if (this.args.autoLaunch === false) {
			cb(err);
		} else {
			if (err)
				return cb(err);
			var deducedCapabilities = getDeducedCapabilities(this.args.appPackage);
			if (!deducedCapabilities)
				return cb(new Error(
						"Couldn't deduce Opera capabilities for package " +
						this.args.appPackage));
			this.args.androidDeviceSocket = deducedCapabilities.socket;
			this.adb
			.shell(
					"echo 'opera --disable-fre --enable-remote-debugging --metrics-recording-only' > /data/local/tmp/" +
					deducedCapabilities.commandLineFile,
					cb);
		}
	}.bind(this));
};

function getDeducedCapabilities(packageName) {
  var productName = "", betaPart = "";
  var packageParts = packageName.split(".");
  for (var i = 0; i < packageParts.length; i++) {
    var part = packageParts[i];
    if (part === "opera" || part === "mini") {
      productName = part;
    }
    else if (part === "beta") {
      betaPart = "_beta";
    }
    else if (part !== "com" && part !== "browser" && part !== "android") {
      return; //ERROR
    }
  }
  if (productName) {
    var socket = productName + betaPart + "_devtools_remote";
    var commandLineFile = productName === "mini" ? "opera-mini-command-line" : "opera-browser-command-line";
    return {'socket' : socket, 'commandLineFile' : commandLineFile };
  }
  else {
    return; //ERROR
  }
}

module.exports = Opera;
