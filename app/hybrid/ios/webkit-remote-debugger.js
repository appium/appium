"use strict";
/* DEPENDENCIES */

var net = require('net')
  , appLogger = require('../../../logger.js').get('appium')
  , _ = require('underscore')
  , atoms = require('./webdriver-atoms')
  , status = require("../../uiauto/lib/status")
  , uuid = require('node-uuid')
  , colors = require('colors')
  , noop = function () {}
  , assert = require('assert')
  , util = require('util')
  , RemoteDebugger = require('./remote-debugger.js')
  , http = require('http')
  , WebSocket = require('ws');

var logger = {
  info: function(msg) {
    appLogger.info("[REMOTE] " + msg);
  }
  , debug: function(msg) {
    appLogger.debug(("[REMOTE] " + msg).grey);
  }
  , error: function(msg) {
    appLogger.error("[REMOTE] " + msg);
  }
};

// ====================================
// CONFIG
// ====================================

var WebKitRemoteDebugger = function(debuggerType, onDisconnect) {
  this.socket = null;
  this.connId = uuid.v4();
  this.senderId = uuid.v4();
  this.appIdKey = null;
  this.pageIdKey = null;
  this.pageLoading = false;
  this.curMsgId = 0;
  this.dataCbs = {};
  this.dataMethods = {};
  this.willNavigateWithoutReload = false;
  this.onAppDisconnect = onDisconnect || noop;
  this.pageChangeCb = noop;
  this.specialCbs = {
    '_rpc_reportIdentifier:': noop
    , '_rpc_forwardGetListing:': noop
    , 'connect': noop
  };
  this.pageLoadedCbs = [];
  this.setHandlers();
  this.received = new Buffer(0);
  this.readPos = 0;
  this.host = 'localhost';
  this.port = 27753;
  this.debuggerType = debuggerType;
};

//extend the remote debugger
WebKitRemoteDebugger.prototype = RemoteDebugger.init();

// ====================================
// API
// ====================================

WebKitRemoteDebugger.prototype.connect = function(pageId, cb, pageChangeCb) {
  var me = this;
  this.frameNavigatedCbs = [];
  this.pageChangeCb = pageChangeCb;
  var url = 'ws://' + this.host + ':' + this.port + '/devtools/page/' + pageId;
  this.pageIdKey = pageId;
  this.socket = new WebSocket(url);
  this.socket.on('open', function() {
    logger.info('Debugger web socket connected to url [' + url + ']');
    cb();
  });
  this.socket.on('close', function() {
    logger.info('Debugger web socket disconnected');
    me.socket.close();
  });
  this.socket.on('error', function(exception) {
    console.log('Debugger web socket error %s', exception);
  });
  this.socket.on('message', function(data) {
    console.log('Debugger web socket received data :  %s', data);
    me.receive(data);
  });
};

WebKitRemoteDebugger.prototype.disconnect = function() {
  var me = this;
  logger.info("Disconnecting from remote debugger");
  this.socket.close(1000, function(){
      me.socket = null;
  });
};

WebKitRemoteDebugger.prototype.pageArrayFromJson = function(cb){
  this.getJSONFromUrl(this.host, this.port, '/json',function(returnValue){
    var pageElementJSON =  returnValue;
    var newPageArray = [];
    //Add elements to the array
    _.each(pageElementJSON, function(pageObject) {
      var urlArray = pageObject.webSocketDebuggerUrl.split('/').reverse();
      var id = urlArray[0];
      newPageArray.push({
        id: id
        , title: pageObject.title
        , url: pageObject.url
        , isKey: id
      });
    });
    cb(newPageArray);
  });
};

//TODO: move to utility class
WebKitRemoteDebugger.prototype.getJSONFromUrl = function(host, port, path, callback){
  http.get({ host: host, port: port, path: path }, function(response) {
    var jsonResponse = "";
    response.on('data', function(chunk) {
      jsonResponse += chunk;
    });
    response.on('end', function() {
      callback(JSON.parse(jsonResponse));
    });
  });
};

// ====================================
// HANDLERS
// ====================================

WebKitRemoteDebugger.prototype.handleMessage = function(data, method) {
  var handlerFor = null;
  if (method !== null) {
    handlerFor = method;
  } else {
    handlerFor = data.method;
  }
  if (!handlerFor) {
    logger.debug("Got an invalid method");
    return;
  }
  if (_.has(this.handlers, handlerFor)) {
    this.handlers[handlerFor](data);
  } else {
    logger.info("Debugger got a message for '" + handlerFor + "' and have no " +
                "handler, doing nothing.");
  }
};

WebKitRemoteDebugger.prototype.setHandlers = function() {
  var me = this;
  this.handlers = {
    'Runtime.evaluate': function (data) {
      var msgId = data.id
      , result = data.result
      , error = data.error || null;
      me.dataCbs[msgId](error, result);
      me.dataCbs[msgId] = null;
    } ,
    'Profiler.resetProfiles' : function(data) {
      logger.info("Device is telling us to reset profiles. Should probably " +
            "do some kind of callback here");
      //me.onPageChange();
    },
    'Page.navigate' : function(data) {
      me.pageLoad();
      logger.info("Page.Navigate");
    }
  };
};

// ====================================
// SOCKET I/O
// ====================================

WebKitRemoteDebugger.prototype.send = function (data, cb) {
  var me = this;
  //increase the current id
  this.curMsgId += 1;
  //set the id in the message
  data.id = this.curMsgId;
  //store the call back and the data sent
  this.dataCbs[this.curMsgId.toString()] = cb;
  this.dataMethods[this.curMsgId.toString()] = data.method;
  //send the data
  logger.info('Remote debugger data sent [' + JSON.stringify(data) + ']');
  data = JSON.stringify(data);
  this.socket.send(data, function(error) {
      if(error !== null && typeof error !== "undefined"){
        logger.info(error);
      }
  });
};

WebKitRemoteDebugger.prototype.receive = function(data){
  var method = null;
  data = JSON.parse(data);
  //check if there was an id
  if(data.id) {
    method = this.dataMethods[data.id];
  }
  this.handleMessage(data, method);
};

exports.init = function(onDisconnect) {
  return new WebKitRemoteDebugger(1, onDisconnect);
};