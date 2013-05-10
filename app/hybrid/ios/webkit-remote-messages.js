"use strict";

var _ = require("underscore");

//TODO: remove un-necessary fields (e.g. appIdKey, connId, senderId)
exports.sendJSCommand = function(js, appIdKey, connId, senderId, pageIdKey) {
  return exports.command("Runtime.evaluate",
      {expression: js, returnByValue: true});
};

exports.callJSFunction = function(objId, fn, args, appIdKey, connId, senderId, pageIdKey) {
  return exports.command("Runtime.callFunctionOn",
      {objectId: objId, functionDeclaration: fn, arguments: args, returnByValue: true});
};

exports.setUrl = function(url, appIdKey, connId, senderId, pageIdKey) {
  return exports.command("Page.navigate", {url: url});
};

exports.enablePage = function(appIdKey, connId, senderId, pageIdKey) {
  return exports.command("Page.enable", {});
};


//generate a json request using the webkit protocol
exports.command = function(method, params) {
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