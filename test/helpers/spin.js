"use strict";

var Q = require("q");

exports.spinWait = function (spinFn, waitMs, intMs) {
  if (typeof waitMs === "undefined") {
    waitMs = 10000;
  }
  if (typeof intMs === "undefined") {
    intMs = 500;
  }
  var begunAt = Date.now();
  var endAt = begunAt + waitMs;
  var spin = function () {
    return spinFn().catch(function (err) {
      if (Date.now() < endAt) {
        return Q.delay(intMs).then(spin);
      } else {
        throw new Error("spinWait condition unfulfilled. Promise rejected with error:", err);
      }
    });
  };
  return spin();
};

exports.spinTillResEquals = function () {};

exports.spinTillNoError = function () {};

exports.spinTillError = function () {};
