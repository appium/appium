"use strict";

var _s = require('underscore.string')
  , logger = require('./server/logger.js').get('appium')
  , doRequest = require('./device').doRequest
  , respondError = require('./responses').respondError
  , _ = require('underscore');


module.exports.shouldProxy = function(req) {
  if (req.device === null) return false;
  if (!req.device.isProxy) return false;

  var deviceAvoids = req.device.avoidProxy || [];

  var avoid = [
    ['POST', new RegExp('^/wd/hub/session$')]
    , ['DELETE', new RegExp('^/wd/hub/session/[^/]+$')]
  ].concat(deviceAvoids);
  var method = req.route.method.toUpperCase();
  var path = req.originalUrl;
  var shouldAvoid = false;

  // check for POST /execute mobile:
  if (method === 'POST' &&
      new RegExp('^/wd/hub/session/.+/execute$').test(path) &&
      _s.startsWith(req.body.script, "mobile: ")) {
    shouldAvoid = true;
  }

  _.each(avoid, function(pathToAvoid) {
    if (method === pathToAvoid[0] && pathToAvoid[1].exec(path)) {
      shouldAvoid = true;
    }
  });
  return !shouldAvoid;
};

module.exports.doProxy = function(req, res, next) {
  logger.debug("Proxying command to " + req.device.proxyHost + ":" +
               req.device.proxyPort);
  var url = 'http://' + req.device.proxyHost + ':' + req.device.proxyPort +
            req.originalUrl;
  doRequest(url, req.route.method.toUpperCase(), req.body,
          req.headers['content-type'], function(err, response, body) {
    if (err) return next(err);
    if (body && body.value) {
      var resStatusCode = body.status;
      if (resStatusCode !== 0) {
        var resErrorMessage = body.value.message;
        return respondError(req, res, resStatusCode, resErrorMessage);
      }
    }

    var sbody = body ? JSON.stringify(body).slice(0, 10000) : body;

    logger.debug("Proxied response received with status " +
                 response.statusCode + ": " +
                 sbody);
    res.headers = response.headers;
    res.set('Content-Type', response.headers['content-type']);
    res.send(response.statusCode, body);
  });
};
