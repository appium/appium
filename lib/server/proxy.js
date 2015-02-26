"use strict";

var _s = require('underscore.string')
  , logger = require('./logger.js').get('appium')
  , status = require('./status.js')
  , doRequest = require('../devices/common.js').doRequest
  , respondError = require('./responses.js').respondError
  , _ = require('underscore')
  , safely = require('./helpers').safely;


module.exports.shouldProxy = function (req) {
  if (req.device === null) return false;
  if (!req.device.isProxy) return false;

  var deviceAvoids = req.device.avoidProxy || [];

  var avoid = [
    ['POST', new RegExp('^/wd/hub/session$')]
    , ['DELETE', new RegExp('^/wd/hub/session/[^/]+$')]
  ].concat(deviceAvoids);
  var method = req.method.toUpperCase();
  var path = req.originalUrl;
  var shouldAvoid = false;

  // check for POST /execute mobile:
  if (method === 'POST' &&
      new RegExp('^/wd/hub/session/.+/execute$').test(path) &&
      _s.startsWith(req.body.script, "mobile: ")) {
    shouldAvoid = true;
  }

  _.each(avoid, function (pathToAvoid) {
    if (method === pathToAvoid[0] && pathToAvoid[1].exec(path)) {
      shouldAvoid = true;
    }
  });
  return !shouldAvoid;
};

module.exports.doProxy = function (req, res) {
  logger.debug("Proxying command to " + req.device.proxyHost + ":" +
               req.device.proxyPort);
  var sessRe = new RegExp('^/wd/hub/session/([^/]+)');
  var sessionRegxMatch = sessRe.exec(req.originalUrl);
  var newPath;
  // there might be no session id in the orig. req.
  if (sessionRegxMatch) {
    var origSessId = sessionRegxMatch[1];
    var sessId = req.device.proxySessionId ? req.device.proxySessionId :
                                             origSessId;
    newPath = req.originalUrl.replace(origSessId, sessId);
  } else {
    newPath = req.originalUrl;
  }
  var url = 'http://' + req.device.proxyHost + ':' + req.device.proxyPort +
            newPath;
  doRequest(url, req.method.toUpperCase(), req.body,
          req.headers['content-type'], function (err, response, body) {
    if (err) {
      return respondError(req, res, status.codes.UnknownError.code,
        "Did not successfully proxy server command");
    }
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
    safely(req, function () {
      res.headers = response.headers;
      res.set('Content-Type', response.headers['content-type']);
      res.status(response.statusCode).send(body);
    });
  });
};
