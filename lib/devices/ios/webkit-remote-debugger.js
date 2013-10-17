"use strict";
/* DEPENDENCIES */

var appLogger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , colors = require('colors')
  , RemoteDebugger = require('./remote-debugger.js').RemoteDebugger
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

var WebKitRemoteDebugger = function(onDisconnect) {
  this.dataMethods = {};
  this.host = 'localhost';
  this.port = 27753;
  this.socketDisconnectCb = null;
  this.init(1, onDisconnect);
};

//extend the remote debugger
_.extend(WebKitRemoteDebugger.prototype, RemoteDebugger.prototype);

// ====================================
// API
// ====================================

WebKitRemoteDebugger.prototype.connect = function(pageId, cb, pageChangeCb) {
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
    logger.info("Disconnecting from remote debugger");
    this.socket = null;
    if(this.socketDisconnectCb){
      this.socketDisconnectCb();
      this.socketDisconnectCb = null;
    }
  }.bind(this));
  this.socket.on('error', function(exception) {
    console.log('Debugger web socket error %s', exception);
  });
  this.socket.on('message', function(data) {
    console.log('Debugger web socket received data :  %s', data);
    this.receive(data);
  }.bind(this));
};

WebKitRemoteDebugger.prototype.disconnect = function(cb) {
  if(this.isConnected()){
    this.socket.close(1001);
    this.socketDisconnectCb = cb;
  } else {
    cb();
  }
};

WebKitRemoteDebugger.prototype.isConnected = function() {
  return (this.socket !== null);
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
  this.handlers = {
    'Runtime.evaluate': function (data) {
      var msgId = data.id
      , result = data.result
      , error = data.error || null;
      this.dataCbs[msgId](error, result);
      this.dataCbs[msgId] = null;
    }.bind(this) ,
    'Profiler.resetProfiles' : function(data) {
      logger.info("Device is telling us to reset profiles. Should probably " +
            "do some kind of callback here");
      //me.onPageChange();
    }
  };
};

// ====================================
// SOCKET I/O
// ====================================

WebKitRemoteDebugger.prototype.send = function (data, cb) {
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
  return new WebKitRemoteDebugger(onDisconnect);
};
