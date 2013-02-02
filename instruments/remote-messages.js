"use strict";

// Connection

exports.setConnectionKey = function(connId) {
  return {
    __argument: {
      WIRConnectionIdentifierKey: connId
    },
    __selector : '_rpc_reportIdentifier:'
  };
};

exports.connectToApp = function(connId, appIdKey) {
  return {
    __argument: {
      WIRConnectionIdentifierKey: connId,
      WIRApplicationIdentifierKey: appIdKey
    },
    __selector : '_rpc_forwardGetListing:'
  };
};

exports.setSenderKey = function(connId, appIdKey, senderId, pageIdKey) {
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

exports.indicateWebView = function(connId, appIdKey, pageIdKey, enabled) {
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

exports.sendJSCommand = function(js, appIdKey, connId, senderId, pageIdKey) {
  return exports.command("Runtime.evaluate",
      {expression: js, returnByValue: true}, appIdKey, connId, senderId, pageIdKey);
};

exports.callJSFunction = function(objId, fn, args, appIdKey, connId, senderId, pageIdKey) {
  return exports.command("Runtime.callFunctionOn",
      {objectId: objId, functionDeclaration: fn, arguments: args, returnByValue: true},
      appIdKey, connId, senderId, pageIdKey);
};

exports.command = function(method, params, appIdKey, connId, senderId, pageIdKey) {
  var plist = {
    __argument: {
      WIRApplicationIdentifierKey: appIdKey,
      WIRSocketDataKey: {
        method: method,
        //objectGroup: "console",
        //includeCommandLineAPI: true,
        //doNotPauseOnExceptionsAndMuteConsole: true,
        params: {}
      },
      WIRConnectionIdentifierKey: connId,
      WIRSenderKey: senderId,
      WIRPageIdentifierKey: pageIdKey
    },
    __selector: '_rpc_forwardSocketData:'
  };
  if (params) {
    plist.__argument.WIRSocketDataKey.params = params;
  }
  return plist;
};
