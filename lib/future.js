/* global Promise:true */
"use strict";

var _ = require('underscore')
  , Q = require('q')
  , simctl = require('node-simctl')
  , xcode = require('appium-xcode');

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
  return nodeifyFn(obj);
};

var nodeifyFn = function (fn, bindObj) {
  if (typeof bindObj === "undefined") {
    bindObj = null;
  }
  var newFn = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var cb = args[args.length - 1];
    args = args.slice(0, -1);
    return new Q(fn.apply(bindObj, args)).nodeify(cb);
  };
  return newFn;
};

// if we've imported es6 Promise type functions, ensure we can still use
// Q/B-like "nodeify" on them in our transitional code
if (typeof Promise !== "function") {
  require('es6-promise').polyfill();
}
Promise.prototype.nodeify = function (cb) {
  this.then(function (res) {
    cb(null, res);
  }, function (err) {
    cb(err);
  });
};

module.exports = {
  simctl: nodeify(simctl),
  xcode: nodeify(xcode),
  nodeify: nodeify
};
