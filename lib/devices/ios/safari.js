"use strict";

var IOS = require('./ios.js')
  , _ = require('underscore');

var Safari = function(args) {
  this.init(args);
};

_.extend(Safari.prototype, IOS.prototype);

module.exports = Safari;
