"use strict";

var express = require('express')
  , _s = require('underscore.string');

module.exports.parserWrap = function(req, res, next) {
  // allow guineapig
  if (!_s.startsWith(req.path, "/test")) {
    // hack because python client library sux
    if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
      req.headers['content-type'] = 'application/json';
    }
  }

  next();
};
