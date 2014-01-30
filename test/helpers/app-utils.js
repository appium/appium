"use strict";

var env = require('./env'),
    path = require('path');

module.exports.getAppPath = function (app) {
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

