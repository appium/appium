"use strict";

var _ = require('underscore')
  , Q = require('q')
  , simctl = require("node-simctl");

var nodeify = function (obj) {
  if (typeof obj !== "function") {
    var nodeified = {};
    _.each(Object.getOwnPropertyNames(obj), function (name) {
      if (name !== "__esModule") {
        nodeified[name] = nodeify(obj[name]);
      }
    });
    return nodeified;
  }
  return function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var cb = args[args.length - 1];
    args = args.slice(0, -1);
    return new Q(obj.apply(null, args)).nodeify(cb);
  };
};

module.exports = {
  simctl: nodeify(simctl),
  nodeify: nodeify
};
