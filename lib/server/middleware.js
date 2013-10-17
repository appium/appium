"use strict";

var express = require('express')
  , _s = require('underscore.string')
  , bodyParser = express.bodyParser();

module.exports.parserWrap = function(req, res, next) {
  // wd.js sends us http POSTs with empty body which will make bodyParser fail.
  var cLen = req.get('content-length');
  if (typeof cLen === "undefined" || parseInt(cLen, 10) <= 0) {
    req.headers['content-length'] = 0;
    next();
  } else {
    // allow guineapig
    if (!_s.startsWith(req.path, "/test")) {
      // hack because python client library sux
      if (req.headers['content-type'] === 'application/x-www-form-urlencoded') {
        req.headers['content-type'] = 'application/json';
      }
    }
    bodyParser(req, res, next);
  }
};
