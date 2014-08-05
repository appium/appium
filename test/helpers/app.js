"use strict";

var env = require('./env');

module.exports.getAppPath = function (app) {
  if (env.IOS) {
    return "sample-code/apps/" + app +
      "/build/Release-iphonesimulator/" + app + ".app";
  }
  if (env.ANDROID || env.SELENDROID) {
    return "sample-code/apps/" + app +
      "/bin/" + app + "-debug.apk";
  }
  return app;
};
