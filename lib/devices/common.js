"use strict";

var errors = require('../server/errors.js')
  , request = require('request')
  , _ = require('underscore')
  , exec = require('child_process').exec
  , status = require("../server/status.js")
  , logger = require('../server/logger.js').get('appium')
  , logDeprecationWarning = require('../helpers.js').logDeprecationWarning;

var UnknownError = errors.UnknownError
  , ProtocolError = errors.ProtocolError;

exports.respond = function (response, cb) {
  if (typeof response === 'undefined') {
    cb(null, '');
  } else {
    if (typeof(response) !== "object") {
      cb(new UnknownError(), response);
    } else if (!('status' in response)) {
      cb(new ProtocolError('Status missing in response from device'), response);
    } else {
      var status = parseInt(response.status, 10);
      if (isNaN(status)) {
        cb(new ProtocolError('Invalid status in response from device'), response);
      } else {
        response.status = status;
        cb(null, response);
      }
    }
  }
};

exports.proxy = function (command, cb) {
  logger.debug('Pushing command to appium work queue: ' + JSON.stringify(command));
  this.push([command, cb]);
};

exports.proxyWithMinTime = function (command, ms, cb) {
  var start = Date.now();
  logger.debug('Pushing command to appium work queue: ' + JSON.stringify(command));
  this.push([command, function () {
    var args = Array.prototype.slice.call(arguments, 0);
    var waitNeeded = ms - (Date.now() - start);
    if (waitNeeded > 0) {
      setTimeout(function () {
        cb.apply(null, args);
      }, waitNeeded);
    } else {
      cb.apply(null, args);
    }
  }]);
};

exports.resetTimeout = function () {
  if (this.onResetTimeout) this.onResetTimeout();
};

exports.waitForCondition = function (waitMs, condFn, cb, intervalMs) {
  if (typeof intervalMs === "undefined") {
    intervalMs = 500;
  }
  var begunAt = Date.now();
  var endAt = begunAt + waitMs;
  var spin = function () {
    condFn(function (condMet) {
      var args = Array.prototype.slice.call(arguments);
      if (condMet) {
        cb.apply(this, args.slice(1));
      } else if (Date.now() < endAt) {
        setTimeout(spin, intervalMs);
      } else {
        cb.apply(this, args.slice(1));
      }
    }.bind(this));
  }.bind(this);
  spin();
};

exports.implicitWaitForCondition = function (condFn, cb) {
  var _condFn = condFn;
  condFn = function () {
    var args = Array.prototype.slice.call(arguments, 0);
    this.resetTimeout();
    _condFn.apply(this, args);
  }.bind(this);
  this.waitForCondition(this.implicitWaitMs, condFn, cb);
};

exports.doRequest = function (url, method, body, contentType, cb) {
  if (typeof cb === "undefined" && typeof contentType === "function") {
    cb = contentType;
    contentType = null;
  }
  if (typeof contentType === "undefined" || contentType === null) {
    contentType = "application/json;charset=UTF-8";
  }
  if (!(/^https?:\/\//.exec(url))) {
    url = 'http://' + url;
  }
  var opts = {
    url: url
  , method: method
  };
  if (_.contains(['put', 'post', 'patch'], method.toLowerCase())) {
    if (typeof body === "object") {
      opts.json = body;
    } else {
      opts.body = body || "";
    }
  }
  // explicitly set these headers with correct capitalization to work around
  // an issue in node/requests
  logger.debug("Making http request with opts: " + JSON.stringify(opts));
  request(opts, function (err, res, body) {
    cb(err, res, body);
  });
};

exports.isAppInstalled = function (isInstalledCommand, cb) {
  logger.debug("Checking app install status using: " + isInstalledCommand);
  exec(isInstalledCommand, function (error, stdout) {
    cb(error, stdout);
  });
};

exports.removeApp = function (removeCommand, udid, bundleId, cb) {
  logger.debug("Removing app using cmd: " + removeCommand);
  exec(removeCommand, function (error) {
    if (error !== null) {
      cb(new Error('Unable to un-install [' + bundleId + '] from device with id [' + udid + ']. Error [' + error + ']'));
    } else {
      cb(error, 'Successfully un-installed [' + bundleId + '] from device with id [' + udid + ']');
    }
  });
};

exports.installApp = function (installationCommand, udid, unzippedAppPath, cb) {
  logger.debug("Installing app using cmd: " + installationCommand);
  exec(installationCommand, { maxBuffer: 524288 }, function (error) {
    if (error !== null) {
      cb(new Error('Unable to install [' + unzippedAppPath + '] to device with id [' + udid + ']. Error [' + error + ']'));
    } else {
      cb(error, 'Successfully unzipped and installed [' + unzippedAppPath + '] to device with id [' + udid + ']');
    }
  });
};

exports.unpackApp = function (req, packageExtension, cb) {
  var reqAppPath = req.body.appPath;
  if (reqAppPath.toLowerCase().substring(0, 4) === "http") {
    req.appium.downloadAndUnzipApp(reqAppPath, function (err, appPath) {
      cb(appPath);
    });
  } else if (reqAppPath.toLowerCase().substring(reqAppPath.length - 4) === ".zip") {
    req.appium.unzipLocalApp(reqAppPath, function (err, appPath) {
      cb(appPath);
    });
  } else if (reqAppPath.toLowerCase().substring(reqAppPath.length - 4) === packageExtension) {
    cb(reqAppPath.toString());
  } else {
    cb(null);
  }
};

exports.proxyTo = function (endpoint, method, data, cb) {
  if (endpoint[0] !== '/') {
    endpoint = '/' + endpoint;
  }
  var url = 'http://' + this.proxyHost + ':' + this.proxyPort + endpoint;
  exports.doRequest(url, method, data ? data : '', cb);
};

exports.parseExecuteResponse = function (response, cb) {
  if ((response.value !== null) && (typeof response.value !== "undefined")) {
    var wdElement = null;
    if (!_.isArray(response.value)) {
      if (typeof response.value.ELEMENT !== "undefined") {
        wdElement = response.value.ELEMENT;
        wdElement = this.parseElementResponse(response.value);
        if (wdElement === null) {
          cb(null, {
            status: status.codes.UnknownError.code
          , value: "Error converting element ID atom for using in WD: " + response.value.ELEMENT
          });
        }
        response.value = wdElement;
      }
    } else {
      var args = response.value;
      for (var i = 0; i < args.length; i++) {
        wdElement = args[i];
        if ((args[i] !== null) && (typeof args[i].ELEMENT !== "undefined")) {
          wdElement = this.parseElementResponse(args[i]);
          if (wdElement === null) {
            cb(null, {
              status: status.codes.UnknownError.code
            , value: "Error converting element ID atom for using in WD: " + args[i].ELEMENT
            });
            return;
          }
          args[i] = wdElement;
        }
      }
      response.value = args;
    }
  }
  return response;
};

exports.checkValidLocStrat = function (strat, includeWeb, cb) {
  if (typeof includeWeb === "undefined") {
    includeWeb = false;
  }
  var validStrats = [
    'xpath',
    'id',
    'name',
    'dynamic',
    'class name'
  ];
  var nativeStrats = [
    '-ios uiautomation',
    'accessibility id',
    '-android uiautomator'
  ];
  var webStrats = [
    'link text',
    'css selector',
    'tag name',
    'partial link text'
  ];
  var nativeDeprecations = {};
  var webDeprecations = {};
  var deprecations = {dynamic: '-android uiautomator or -ios uiautomation', name: 'accessibility id'};

  if (includeWeb) {
    validStrats = validStrats.concat(webStrats);
    deprecations = _.extend(deprecations, webDeprecations);
  } else {
    validStrats = validStrats.concat(nativeStrats);
    deprecations = _.extend(deprecations, nativeDeprecations);
  }
  if (!_.contains(validStrats, strat)) {
    logger.debug("Invalid locator strategy: " + strat);
    cb(null, {
      status: status.codes.UnknownCommand.code,
      value: {message: "Invalid locator strategy: " + strat}
    });
    return false;
  } else {
    if (_.has(deprecations, strat)) {
      logDeprecationWarning('locator strategy', strat, deprecations[strat]);
    }
    return true;
  }
};

exports.parseElementResponse = function (element) {
  var objId = element.ELEMENT
    , clientId = (5000 + this.webElementIds.length).toString();
  this.webElementIds.push(objId);
  return {ELEMENT: clientId};
};

exports.getAtomsElement = function (wdId) {
  var atomsId;
  try {
    atomsId = this.webElementIds[parseInt(wdId, 10) - 5000];
  } catch (e) {
    return null;
  }
  if (typeof atomsId === "undefined") {
    return null;
  }
  return {'ELEMENT': atomsId};
};

exports.useAtomsElement = function (elementId, failCb, cb) {
  if (parseInt(elementId, 10) < 5000) {
    logger.debug("Element with id " + elementId + " passed in for use with " +
                "atoms, but it's out of our internal scope. Adding 5000");
    elementId = (parseInt(elementId, 10) + 5000).toString();
  }
  var atomsElement = this.getAtomsElement(elementId);
  if (atomsElement === null) {
    failCb(null, {
      status: status.codes.UnknownError.code
    , value: "Error converting element ID for using in WD atoms: " + elementId
    });
  } else {
    cb(atomsElement);
  }
};

exports.convertElementForAtoms = function (args, cb) {
  for (var i = 0; i < args.length; i++) {
    if (args[i] !== null && typeof args[i].ELEMENT !== "undefined") {
      var atomsElement = this.getAtomsElement(args[i].ELEMENT);
      if (atomsElement === null) {
        cb(true, {
          status: status.codes.UnknownError.code
        , value: "Error converting element ID for using in WD atoms: " + args[i].ELEMENT
        });
        return;
      }
      args[i] = atomsElement;
    }
  }
  cb(null, args);
};

exports.jwpError = function (err, code, cb) {
  if (typeof code === "function") {
    cb = code;
    code = null;
  }
  if (code) {
    return cb(null, {
      status: code
    , value: err.message
    });
  }
  return cb(err);
};

exports.jwpSuccess = function (val, cb) {
  if (typeof val === "function") {
    cb = val;
    val = null;
  }
  return cb(null, {
    status: status.codes.Success.code
  , value: val
  });
};

exports.jwpResponse = function (err, val, cb) {
  if (typeof err === "function") {
    return exports.jwpSuccess(err);
  }
  if (typeof val === "function") {
    cb = val;
    val = null;
  }
  if (err) {
    return exports.jwpError(err, status.codes.UnknownError.code, cb);
  }
  return exports.jwpSuccess(val, cb);
};
