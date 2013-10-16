"use strict";

var logger = require('../logger').get('appium')
  , status = require('./uiauto/lib/status')
  , _ = require('underscore');

var getSessionId = function(req, response) {
  var sessionId = (typeof response == 'undefined') ? undefined : response.sessionId;
  if (typeof sessionId === "undefined") {
    if (req.appium) {
      sessionId = req.appium.sessionId || null;
    } else {
      sessionId = null;
    }
  }
  if (typeof sessionId !== "string" && sessionId !== null) {
    sessionId = null;
  }
  return sessionId;
};

var notImplementedInThisContext = function(req, res) {
  logger.info("Responding to client that a method is not implemented " +
              "in this context");
  res.send(501, {
    status: status.codes.UnknownError.code
    , sessionId: getSessionId(req)
    , value: {
      message: "Not implemented in this context, try switching " +
               "into or out of a web view"
    }
  });
};

var respondError = exports.respondError = function(req, res, statusObj, value) {
  var code = 1, message = "An unknown error occurred";
  var newValue = value;
  if (typeof statusObj === "string") {
    message = statusObj;
  } else if (typeof statusObj === "undefined") {
    message = "undefined status object";
  } else if (typeof statusObj === "number") {
    code = statusObj;
    message = status.getSummaryByCode(code);
  } else if (typeof statusObj.code !== "undefined") {
    code = statusObj.code;
    message = statusObj.summary;
  } else if (typeof statusObj.message !== "undefined") {
    message = statusObj.message;
  }

  if (typeof newValue === "object") {
    if (newValue !== null && _.has(value, "message")) {
      // make sure this doesn't get obliterated
      value.origValue = value.message;
      message += " (Original error: " + value.message + ")";
    }
    newValue = _.extend({message: message}, value);
  } else {
    newValue = {message: message, origValue: value};
  }
  var response = {status: code, value: newValue};
  response.sessionId = getSessionId(req, response);
  logger.info("Responding to client with error: " + JSON.stringify(response));
  res.send(500, response);
};

var respondSuccess = exports.respondSuccess = function(req, res, value, sid) {
  var response = {status: status.codes.Success.code, value: value};
  response.sessionId = getSessionId(req, response) || sid;
  if (typeof response.value === "undefined") {
    response.value = '';
  }
  var printResponse = _.clone(response);
  var maxLen = 1000;
  if (printResponse.value !== null &&
      typeof printResponse.value.length !== "undefined" &&
      printResponse.value.length > maxLen) {
    printResponse.value = printResponse.value.slice(0, maxLen) + "...";
  }
  logger.info("Responding to client with success: " + JSON.stringify(printResponse));
  res.send(response);
};

exports.getResponseHandler = function(req, res) {
  return function(err, response) {
    if (typeof response === "undefined" || response === null) {
      response = {};
    }
    if (err !== null && typeof err !== "undefined" && typeof err.status !== 'undefined' && typeof err.value !== 'undefined') {
      throw new Error("Looks like you passed in a response object as the " +
                      "first param to getResponseHandler. Err is always the " +
                      "first param! Fix your codes!");
    } else if (err !== null && typeof err !== "undefined") {
      if (typeof err.name !== 'undefined') {
        if (err.name == 'NotImplementedError') {
          notImplementedInThisContext(req, res);
        } else if (err.name == "NotYetImplementedError") {
          notYetImplemented(req, res);
        }
      } else {
        var value = response.value;
        if (typeof value === "undefined") {
          value = '';
        }
        respondError(req, res, err.message, value);
      }
    } else {
      if (response.status === 0) {
        respondSuccess(req, res, response.value, response.sessionId);
      } else {
        respondError(req, res, response.status, response.value);
      }
    }
  };
};

exports.checkMissingParams = function(res, params, strict) {
  if (typeof strict === "undefined") {
    strict = false;
  }
  var missingParamNames = [];
  _.each(params, function(param, paramName) {
    if (typeof param === "undefined" || (strict && !param)) {
      missingParamNames.push(paramName);
    }
  });
  if (missingParamNames.length > 0) {
    var missingList = JSON.stringify(missingParamNames);
    logger.info("Missing params for request: " + missingList);
    res.send(400, "Missing parameters: " + missingList);
    return false;
  } else {
    return true;
  }
};

var notYetImplemented = exports.notYetImplemented = function(req, res) {
  logger.info("Responding to client that a method is not implemented");
  res.send(501, {
    status: status.codes.UnknownError.code
    , sessionId: getSessionId(req)
    , value: {
      message: "Not yet implemented. " +
               "Please help us: http://appium.io/get-involved.html"
    }
  });
};

