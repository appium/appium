"use strict";

var Android = require('./android.js')
  , Selendroid = require('./selendroid.js')
  , _ = require('underscore')
  , androidCommon = require('./android-common.js')
  ;

var defaultOperaDesiredCapabilities = {
  appPackage : 'com.opera.browser',
  appActivity : 'com.opera.Opera',
  androidDeviceSocket : 'opera_devtools_remote',
  intentAction : 'com.opera.android.action.PROTECTED_INTENT',
  optionalIntentArguments : ' -e cmd DISMISS_INTRO -d data:, ',
  autoWebviewTimeout : 4000,
  autoWebview : true,
};

var Opera = function (desiredCaps) {
  this.init(desiredCaps);
};

Opera.prototype.init = function (desiredCaps) {
  if (desiredCaps.automationName && desiredCaps.automationName.indexOf('selendroid') !== -1) {
    _.defaults(Opera.prototype, Selendroid.prototype);
    Opera.prototype._installAppForTest = Selendroid.prototype.installAppForTest;
    Opera.prototype._init = Selendroid.prototype.init;
  }
  else {
    _.defaults(Opera.prototype, Android.prototype);
    Opera.prototype._installAppForTest = androidCommon.installAppForTest;
    Opera.prototype._init = Android.prototype.init;
  }
  _.extend(Opera.prototype, operaBase);

  this._init();
  _.defaults(desiredCaps, defaultOperaDesiredCapabilities);
  this.avoidProxy = _.union(this.avoidProxy, [
                     ['POST', new RegExp('^/wd/hub/session/[^/]+/touch/perform')],
                     ['POST', new RegExp('^/wd/hub/session/[^/]+/touch/multi/perform')]
                   ]);
};

var operaBase = {};

operaBase.installAppForTest = function (cb) {
	this
	._installAppForTest(function (err) {
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

operaBase.defaultWebviewName = function () {
	return "CHROMIUM";
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
