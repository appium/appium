"use strict";

var fs = require("fs")
  , path = require("path")
  , atomsCache = {};

exports.get = function (atomName) {
  var atomFileName = path.resolve(__dirname, "webdriver-atoms/" + atomName + ".js");

  // Check if we have already loaded an cached this Atom
  if (!atomsCache.hasOwnProperty(atomName)) {
    try {
      atomsCache[atomName] = fs.readFileSync(atomFileName);
    } catch (e) {
      throw "Unable to load Atom '" + atomName + "' from file '" + atomFileName + "'";
    }
  }

  return atomsCache[atomName];
};
