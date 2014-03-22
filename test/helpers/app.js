"use strict";

var env = require('./env'),
    path = require('path');

module.exports.getAppPath = function (app, device) {
  if (device && device[0] === "i") {
    env.IOS = true;
    env.ANDROID = false;
  } else if (device && device.toLowerCase() === "android") {
    env.ANDROID = true;
    env.IOS = false;
  }
  if (env.IOS) {
    return path.resolve(__dirname, "../../sample-code/apps/" + app +
      "/build/Release-iphonesimulator/" + app + ".app");
  }
  if (env.ANDROID) {
    return path.resolve(__dirname, "../../sample-code/apps/" + app +
      "/bin/" + app + "-debug.apk");
  }
  return app;
};

