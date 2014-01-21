"use strict";

var tryNTimes = function(n , fn) {
  if (n <= 0) return;
    return fn().catch(function() {
      return tryNTimes(n-1, fn);
  });
};

exports.tryNTimes = tryNTimes;
exports.try3Times = tryNTimes.bind(null, 3);
