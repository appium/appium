"use strict";
/* DEPENDENCIES */

var _ = require('underscore')
  , RemoteDebugger = require('./remote-debugger.js').RemoteDebugger
  , http = require('http')
  , WebSocket = require('ws');

// ====================================
// CONFIG
// ====================================

var WebKitRemoteDebugger = function (onDisconnect) {
  this.dataMethods = {};
  this.host = 'localhost';
  this.port = process.env.REMOTE_DEBUGGER_PORT || 27753;
  this.socketDisconnectCb = null;
  this.init(1, onDisconnect);
};

//extend the remote debugger
_.extend(WebKitRemoteDebugger.prototype, RemoteDebugger.prototype);

// ====================================
// API
// ====================================

WebKitRemoteDebugger.prototype.connect = function (pageId, cb, pageChangeCb) {
  this.frameNavigatedCbs = [];
  this.pageChangeCb = pageChangeCb;
  var url = 'ws://' + this.host + ':' + this.port + '/devtools/page/' + pageId;
  this.pageIdKey = pageId;
  this.socket = new WebSocket(url);
  this.socket.on('open', function () {
    this.logger.debug('Debugger web socket connected to url [' + url + ']');
    cb();
  }.bind(this));
  this.socket.on('close', function () {
    this.logger.debug("Disconnecting from remote debugger");
    this.socket = null;
    if (this.socketDisconnectCb) {
      this.socketDisconnectCb();
      this.socketDisconnectCb = null;
    }
  }.bind(this));
  this.socket.on('error', function (exception) {
    console.log('Debugger web socket error %s', exception);
  });
  this.socket.on('message', function (data) {
    console.log('Debugger web socket received data :  %s', data);
    this.receive(data);
  }.bind(this));
};

WebKitRemoteDebugger.prototype.disconnect = function (cb) {
  if (this.isConnected()) {
    this.socket.close(1001);
    this.socketDisconnectCb = cb;
  } else {
    cb();
  }
};

WebKitRemoteDebugger.prototype.isConnected = function () {
  return (this.socket !== null);
};

WebKitRemoteDebugger.prototype.pageArrayFromJson = function (cb) {
  this.logger.debug("Getting WebKitRemoteDebugger pageArray");
  this.getJSONFromUrl(this.host, this.port, '/json', function (err, returnValue) {
    if (err) {
      this.logger.error("Could not connect to WebKitRemoteDebugger server");
      return cb(err);
    }
    var pageElementJSON =  returnValue;
    var newPageArray = [];
    //Add elements to the array
    _.each(pageElementJSON, function (pageObject) {
      var urlArray = pageObject.webSocketDebuggerUrl.split('/').reverse();
      var id = urlArray[0];
      newPageArray.push({
        id: id
      , title: pageObject.title
      , url: pageObject.url
      , isKey: id
      });
    });
    cb(null, newPageArray);
  }.bind(this));
};

//TODO: move to utility class and use requests
WebKitRemoteDebugger.prototype.getJSONFromUrl = function (host, port, path, cb) {
  cb = _.once(cb);
  http.get({ host: host, port: port, path: path }, function (response) {
    var jsonResponse = "";
    response.on('data', function (chunk) {
      jsonResponse += chunk;
    });
    response.on('end', function () {
      cb(null, JSON.parse(jsonResponse));
    });
  }).on('error', cb);
};

// ====================================
// HANDLERS
// ====================================

WebKitRemoteDebugger.prototype.handleMessage = function (data, method) {
  var handlerFor = null;
  if (method !== null) {
    handlerFor = method;
  } else {
    handlerFor = data.method;
  }
  if (!handlerFor) {
    this.logger.debug("Got an invalid method");
    return;
  }
  if (_.has(this.handlers, handlerFor)) {
    this.handlers[handlerFor](data);
  } else {
    this.logger.debug("Debugger got a message for '" + handlerFor +
        "' and have no handler, doing nothing.");
  }
};

WebKitRemoteDebugger.prototype.setHandlers = function () {
  this.handlers = {
    'Runtime.evaluate': function (data) {
      var msgId = data.id
      , result = data.result
      , error = data.error || null;
      this.dataCbs[msgId](error, result);
      this.dataCbs[msgId] = null;
    }.bind(this),
    'Profiler.resetProfiles': function () {
      this.logger.debug("Device is telling us to reset profiles. Should probably " +
            "do some kind of callback here");
    }.bind(this)
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
  this.logger.debug('Remote debugger data sent [' + JSON.stringify(data) + ']');
  data = JSON.stringify(data);
  this.socket.send(data, function (error) {
    if (error !== null && typeof error !== "undefined") {
      this.logger.debug(error);
    }
  }.bind(this));
};

WebKitRemoteDebugger.prototype.receive = function (data) {
  var method = null;
  data = JSON.parse(data);
  //check if there was an id
  if (data.id) {
    method = this.dataMethods[data.id];
  }
  this.handleMessage(data, method);
};

exports.init = function (onDisconnect) {
  return new WebKitRemoteDebugger(onDisconnect);
};
