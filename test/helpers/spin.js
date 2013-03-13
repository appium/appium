"use strict";

exports.spinWait = function(spinFn, cb, waitMs, intMs) {
  if (typeof waitMs === "undefined") {
    waitMs = 10000;
  }
  if (typeof intMs === "undefined") {
    intMs = 500;
  }
  var begunAt = Date.now();
  var endAt = begunAt + waitMs;
  var spin = function() {
    spinFn(function(err) {
      if (err && Date.now() < endAt) {
        setTimeout(spin, intMs);
      } else if (err) {
        throw err;
      } else {
        cb.apply(null, Array.prototype.slice.call(arguments));
      }
    });
  };
  spin();
};

exports.spinTillResEquals = function() {};

exports.spinTillNoError = function() {};

exports.spinTillError = function() {};
