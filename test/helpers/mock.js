"use strict";

exports.mock = function (obj, meth, newMeth) {
  if (typeof obj[meth] !== "function") {
    throw new Error("Cannot mock " + obj + "." + meth + ": it's not a function");
  }
  obj[meth] = newMeth;
};

exports.noop = function (obj, meth) {
  exports.mock(obj, meth, function (cb) { cb(); });
};

exports.noopSync = function (obj, meth) {
  exports.mock(obj, meth, function () { });
};
