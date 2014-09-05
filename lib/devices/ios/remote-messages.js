"use strict";

var _ = require("underscore");

// Connection

exports.setConnectionKey = function (connId) {
  return {
    __argument: {
      WIRConnectionIdentifierKey: connId
    },
    __selector : '_rpc_reportIdentifier:'
  };
};

exports.connectToApp = function (connId, appIdKey) {
  return {
    __argument: {
      WIRConnectionIdentifierKey: connId,
      WIRApplicationIdentifierKey: appIdKey
    },
    __selector : '_rpc_forwardGetListing:'
  };
};

exports.setSenderKey = function (connId, appIdKey, senderId, pageIdKey) {
  return {
    __argument: {
      WIRApplicationIdentifierKey: appIdKey,
      WIRConnectionIdentifierKey: connId,
      WIRSenderKey: senderId,
      WIRPageIdentifierKey: pageIdKey
    },
    __selector: '_rpc_forwardSocketSetup:'
  };
};

// Action

exports.indicateWebView = function (connId, appIdKey, pageIdKey, enabled) {
  return {
    __argument: {
      WIRApplicationIdentifierKey: appIdKey,
      WIRIndicateEnabledKey: typeof enabled === "undefined" ? true : enabled,
      WIRConnectionIdentifierKey: connId,
      WIRPageIdentifierKey: pageIdKey
    },
    __selector: '_rpc_forwardIndicateWebView:'
  };
};

exports.sendJSCommand = function (js, appIdKey, connId, senderId, pageIdKey, debuggerType) {
  return exports.command("Runtime.evaluate",
      {expression: js, returnByValue: true}, appIdKey, connId, senderId, pageIdKey, debuggerType);
};

exports.callJSFunction = function (objId, fn, args, appIdKey, connId, senderId, pageIdKey, debuggerType) {
  return exports.command("Runtime.callFunctionOn",
      {objectId: objId, functionDeclaration: fn, arguments: args, returnByValue: true},
      appIdKey, connId, senderId, pageIdKey, debuggerType);
};

exports.setUrl = function (url, appIdKey, connId, senderId, pageIdKey, debuggerType) {
  return exports.command("Page.navigate", {url: url}, appIdKey, connId,
      senderId, pageIdKey, debuggerType);
};

exports.enablePage = function (appIdKey, connId, senderId, pageIdKey, debuggerType) {
  return exports.command("Page.enable", {}, appIdKey, connId, senderId,
                         pageIdKey, debuggerType);
};

exports.startTimeline = function (appIdKey, connId, senderId, pageIdKey, debuggerType) {
  return exports.command("Timeline.start", {}, appIdKey, connId, senderId,
                         pageIdKey, debuggerType);
};

exports.stopTimeline = function (appIdKey, connId, senderId, pageIdKey, debuggerType) {
  return exports.command("Timeline.stop", {}, appIdKey, connId, senderId,
                         pageIdKey, debuggerType);
};

exports.command = function (method, params, appIdKey, connId, senderId, pageIdKey, debuggerType) {
  if (debuggerType !== null && debuggerType === 1) {
    return exports.commandWebKit(method, params);
  } else {
    return exports.commandWebInspector(method, params, appIdKey, connId, senderId, pageIdKey);
  }
};

exports.commandWebInspector = function (method, params, appIdKey, connId, senderId, pageIdKey) {
  var plist = {
    __argument: {
      WIRApplicationIdentifierKey: appIdKey,
      WIRSocketDataKey: {
        method: method,
        params: {
          objectGroup: "console",
          includeCommandLineAPI: true,
          doNotPauseOnExceptionsAndMuteConsole: true,
        }
      },
      WIRConnectionIdentifierKey: connId,
      WIRSenderKey: senderId,
      WIRPageIdentifierKey: pageIdKey
    },
    __selector: '_rpc_forwardSocketData:'
  };
  if (params) {
    plist.__argument.WIRSocketDataKey.params = _.extend(
        plist.__argument.WIRSocketDataKey.params, params);
  }
  return plist;
};


//generate a json request using the webkit protocol
exports.commandWebKit = function (method, params) {
  var jsonRequest = {
    method: method,
    params: {
      objectGroup: "console",
      includeCommandLineAPI: true,
      doNotPauseOnExceptionsAndMuteConsole: true
    }
  };
  if (params) {
    //if there any parameters add them
    jsonRequest.params = _.extend(jsonRequest.params, params);
  }
  return jsonRequest;
};