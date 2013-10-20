"use strict";

var errors = require('../server/errors.js')
  , request = require('request')
  , _ = require('underscore')
  , exec = require('child_process').exec
  , status = require("../server/status.js")
  , logger = require('../server/logger.js').get('appium');

var UnknownError = errors.UnknownError
  , ProtocolError = errors.ProtocolError;

var logTypesSupported = {
  'logcat' : 'Logs for Android applications, both emulator and real device'
  , 'ios' : 'Logs for iOS applications on real device and simulators'
};

exports.respond = function(response, cb) {
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

exports.proxy = function(command, cb) {
  // was thinking we should use a queue for commands instead of writing to a file
  logger.info('Pushing command to appium work queue: ' + JSON.stringify(command));
  this.push([command, cb]);
  if (typeof command === "object") {
    command = JSON.stringify(command);
  }
};

exports.waitForCondition = function(waitMs, condFn, cb, intervalMs) {
  if (typeof intervalMs === "undefined") {
    intervalMs = 500;
  }
  var begunAt = Date.now();
  var endAt = begunAt + waitMs;
  var spin = function() {
    condFn(function(condMet) {
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

exports.doRequest = function(url, method, body, contentType, cb) {
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
  logger.info("Making http request with opts: " + JSON.stringify(opts));
  request(opts, function(err, res, body) {
    cb(err, res, body);
  });
};

exports.isAppInstalled = function(isInstalledCommand, cb) {
  exec(isInstalledCommand, function(error, stdout) {
    cb(error, stdout);
  });
};

exports.removeApp = function(removeCommand, udid, bundleId, cb) {
  exec(removeCommand, function(error) {
    if (error !== null) {
      cb(error, 'Unable to un-install [' + bundleId + '] from device with id [' + udid + ']. Error [' + error + ']');
    } else {
      cb(error, 'Successfully un-installed [' + bundleId + '] from device with id [' + udid + ']');
    }
  });
};

exports.installApp = function(installationCommand, udid, unzippedAppPath, cb) {
  exec(installationCommand, function(error) {
    if (error !== null) {
      cb(error, 'Unable to install [' + unzippedAppPath + '] to device with id [' + udid + ']. Error [' + error + ']');
    } else {
      cb(error, 'Successfully unzipped and installed [' + unzippedAppPath + '] to device with id [' + udid + ']');
    }
  });
};

exports.unpackApp = function(req, packageExtension, cb) {
  var reqAppPath = req.body.appPath;
  if (reqAppPath.toLowerCase().substring(0, 4) === "http") {
    req.appium.downloadAndUnzipApp(reqAppPath, function(err, appPath) {
      cb(appPath);
    });
  } else if (reqAppPath.toLowerCase().substring(reqAppPath.length - 4) === ".zip") {
    req.appium.unzipLocalApp(reqAppPath, function(err, appPath) {
      cb(appPath);
    });
  } else if (reqAppPath.toLowerCase().substring(reqAppPath.length - 4) === packageExtension) {
    cb(reqAppPath.toString());
  } else {
    cb(null);
  }
};

exports.proxyTo = function(endpoint, method, data, cb) {
  if (endpoint[0] !== '/') {
    endpoint = '/' + endpoint;
  }
  var url = 'http://' + this.proxyHost + ':' + this.proxyPort + endpoint;
  exports.doRequest(url, method, data ? data : '', cb);
};

exports.parseExecuteResponse = function(response, cb) {
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
      for (var i=0; i < args.length; i++) {
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

exports.parseElementResponse = function(element) {
  var objId = element.ELEMENT
    , clientId = (5000 + this.webElementIds.length).toString();
  this.webElementIds.push(objId);
  return {ELEMENT: clientId};
};

exports.getAtomsElement = function(wdId) {
  var atomsId;
  try {
    atomsId = this.webElementIds[parseInt(wdId, 10) - 5000];
  } catch(e) {
    return null;
  }
  if (typeof atomsId === "undefined") {
    return null;
  }
  return {'ELEMENT': atomsId};
};

exports.useAtomsElement = function(elementId, failCb, cb) {
  if (parseInt(elementId, 10) < 5000) {
    logger.info("Element with id " + elementId + " passed in for use with " +
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

exports.convertElementForAtoms = function(args, cb) {
  for (var i=0; i < args.length; i++) {
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

exports.getLog = function(logType, cb) {
  // Check if passed logType is supported
  if (!logTypesSupported.hasOwnProperty(logType)) {
    return cb(null, {
      status: status.codes.UnknownError.code
      , value: "Unsupported log type '" + logType + "', supported types : " + JSON.stringify(logTypesSupported)
    });
  }
  var logs;
  // Check that current logType and instance is compartible
  // Android device and emulators
  if (logType == 'logcat' && this.hasOwnProperty('adb')) {
    try {
      logs = this.adb.getLogcatLogs();
    } catch (e) {
      return cb(e);
    }
  }
  // iOS device and simulators
  if (logType == 'ios' && this.hasOwnProperty('deviceType')) {
    try {
      logs = this.getIosLogs(logType);
    } catch (e) {
      return cb(e);
    }
  }
  // If logs captured sucessfully send response with data, else send error
  if (logs) {
    return cb(null, {
      status: status.codes.Success.code
      , value: logs
    });
  }
  else {
    return cb(null, {
      status: status.codes.UnknownError.code
      , value: "Incompartible logType for this device"
    });
  }
};

exports.getLogTypes = function(cb) {
  return cb(null, {
    status: status.codes.Success.code
    , value: logTypesSupported
  });
};
