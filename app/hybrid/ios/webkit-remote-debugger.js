"use strict";
/* DEPENDENCIES */

var net = require('net')
  , appLogger = require('../../../logger.js').get('appium')
  , _ = require('underscore')
  , messages = require('./webkit-remote-messages.js')
  , atoms = require('./webdriver-atoms')
  , status = require("../../uiauto/lib/status")
  , bplistCreate = require('node-bplist-creator')
  , bplistParse = require('bplist-parser')
  , bufferpack = require('bufferpack')
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


var WebKitRemoteDebugger = function(onDisconnect) {
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
};


//extend the remote debugger
WebKitRemoteDebugger.prototype = RemoteDebugger.init();

// ====================================
// API
// ====================================

WebKitRemoteDebugger.prototype.connect = function(pageId, cb, pageChangeCb) {
    var me = this;
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
        console.log('recv %s', exception);
    });

    this.socket.on('message', function(data) {
        console.log('recv %s', data);
        me.receive(data);

    });


};

//retrieve the page array
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

}

//get a json file from url
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


WebKitRemoteDebugger.prototype.setConnectionKey = function(cb) {
  assert.ok(this.connId);
  var setConnKey = messages.setConnectionKey(this.connId);
  logger.info("Sending connection key");
  this.send(setConnKey, function(simNameKey, simBuildKey) {
    logger.debug("Sim name: " + simNameKey);
    logger.debug("Sim build: " + simBuildKey);
  }, function(appDict) {
    var newDict = {};
    _.each(appDict, function(dict) {
      newDict[dict.WIRApplicationIdentifierKey] = dict.WIRApplicationNameKey;
    });
    cb(newDict);
  });
};

WebKitRemoteDebugger.prototype.selectApp = function(appIdKey, cb) {
  assert.ok(this.connId);
  this.appIdKey = appIdKey;
  var connectToApp = messages.connectToApp(this.connId, this.appIdKey);
  logger.info("Selecting app");
  this.send(connectToApp, _.bind(function(pageDict) {
    cb(this.pageArrayFromDict(pageDict));
    this.specialCbs['_rpc_forwardGetListing:'] = _.bind(this.onPageChange, this);
  }, this));
};

WebKitRemoteDebugger.prototype.pageArrayFromDict = function(pageDict) {
  var newPageArray = [];
  _.each(pageDict, function(dict) {
    newPageArray.push({
      id: dict.WIRPageIdentifierKey
      , title: dict.WIRTitleKey
      , url: dict.WIRURLKey
      , isKey: typeof dict.WIRConnectionIdentifierKey !== "undefined"
    });
  });
  return newPageArray;
};

WebKitRemoteDebugger.prototype.selectPage = function(pageIdKey, cb, skipReadyCheck) {
  var me = this;
  if (typeof skipReadyCheck === "undefined") {
    skipReadyCheck = false;
  }
  assert.ok(this.connId); assert.ok(this.appIdKey); assert.ok(this.senderId);
  this.pageIdKey = pageIdKey;
  var setSenderKey = messages.setSenderKey(this.connId, this.appIdKey,
                                           this.senderId, this.pageIdKey);
  logger.info("Selecting page " + pageIdKey + " and forwarding socket setup");
  this.send(setSenderKey, function() {
    logger.info("Set sender key");
    var enablePage = messages.enablePage(me.appIdKey, me.connId,
                                         me.senderId, me.pageIdKey);
    me.send(enablePage, function() {
      logger.info("Enabled activity on page");
      if (skipReadyCheck) {
        cb();
      } else {
        me.execute('(function(){return document.readyState;})()', function(err, res) {
          logger.info("Checked document readystate");
          if (err || res.result.value == 'loading') {
            me.pageUnload();
          }
          cb();
        });
      }
    });
  });
};

WebKitRemoteDebugger.prototype.onPageChange = function(pageDict) {
  this.pageChangeCb(this.pageArrayFromDict(pageDict));
};

WebKitRemoteDebugger.prototype.wrapScriptForFrame = function(script, frame) {
    var elFromCache = atoms.get('get_element_from_cache')
      , wrapper = "";
    logger.info("Wrapping script for frame " + frame);
    frame = JSON.stringify(frame);
    wrapper += "(function(window) { var document = window.document; ";
    wrapper += "return (" + script + ");";
    wrapper += "})((" + elFromCache + ")(" + frame + "))";
    return wrapper;
};

WebKitRemoteDebugger.prototype.wrapElementEqualsElementAtom = function(args) {
    var elFromCache = atoms.get('get_element_from_cache');
    var wrapper = "function() {";
        wrapper += "var elFromCache = (function(id){ "
        wrapper += "try {";
        wrapper += "(" + elFromCache + ")(id); "
        wrapper += "} catch(e) {";
        wrapper += "return null;"
        wrapper += "}"
        wrapper += "});";
        wrapper += "return (function(a, b) {";
        wrapper += "if (a === null || b === null) { return JSON.stringify({status: 10, value: null});}"
        wrapper += "return JSON.stringify({status: 0, value: a === b});"
        wrapper += "})("
        wrapper += "elFromCache(\"" + args[0] + "\"),";
        wrapper += "elFromCache(\"" + args[1] + "\")";
        wrapper += ");}";

    return wrapper;
};

WebKitRemoteDebugger.prototype.wrapJsEventAtom = function(args) {
  var elFromCache = atoms.get('get_element_from_cache');
  var wrapper = "function() {";
      wrapper += "var elFromCache = (function(id){ ";
      wrapper += "try {";
      wrapper += "return (" + elFromCache + ")(id); ";
      wrapper += "} catch(e) {";
      wrapper += "return null;";
      wrapper += "}";
      wrapper += "});";
      wrapper += "return (function(el) {";
      wrapper += "var evt = document.createEvent('HTMLEvents');";
      wrapper += "evt.initEvent('" + args[0] + "', false, true);";
      wrapper += "el.dispatchEvent(evt);";
      wrapper += "return JSON.stringify({status: 0, value: true});";
      wrapper += "})(";
      wrapper += "elFromCache(" + JSON.stringify(args[1].ELEMENT) + ")";
      wrapper += ");}";
  return wrapper;
};

//TODO: we need to figure out how to wrap the expressions and functions as part of the request.
WebKitRemoteDebugger.prototype.executeAtom = function(atom, args, frames, cb) {
  var atomSrc, script = "";
  if (atom === "title") {
    atomSrc = "function(){return JSON.stringify({status: 0, value: document.title});}";
  } else if (atom === "element_equals_element") {
    atomSrc = this.wrapElementEqualsElementAtom(args);
  } else if (atom === "refresh") {
    atomSrc = "function(){return JSON.stringify({status: 0, value: window.location.reload()});}";
  } else if (atom === "fireEvent") {
    atomSrc = this.wrapJsEventAtom(args);
  } else {
    atomSrc = atoms.get(atom);
  }
  args = _.map(args, JSON.stringify);
  if (frames.length > 0) {
    script = atomSrc;
    for (var i = 0; i < frames.length; i++) {
      script = this.wrapScriptForFrame(script, frames[i]);
    }
    script += "(" + args.join(',') + ")";
  } else {
    logger.info("Executing '" + atom + "' atom in default context");
    script += "(" + atomSrc + ")(" + args.join(',') + ")";

  }
  this.execute(script, function(err, res) {
    if (err) {
      cb(err, {
        status: status.codes.UnknownError.code
        , value: res
      });
    } else {
      if (typeof res.result.value === "undefined") {
        return cb(null, {
          status: status.codes.UnknownError.code
          , value: "Did not get OK result from execute(). Result was: " +
                   JSON.stringify(res.result)
        });
      }
      if (typeof res.result.value === 'string') {
        res.result.value = JSON.parse(res.result.value);
      }
      cb(null, res.result.value);
    }
  });
};

WebKitRemoteDebugger.prototype.executeAtomAsync = function(atom, args, frames, responseUrl, cb) {
  var atomSrc, script = ""
    , asyncCallBack = "";

  asyncCallBack += "function(res) { xmlHttp = new XMLHttpRequest(); xmlHttp.open('POST', '" + responseUrl + "', true);"
  asyncCallBack += "xmlHttp.setRequestHeader('Content-type','application/json'); xmlHttp.send(res); }"

  atomSrc = atoms.get(atom);
  args = _.map(args, JSON.stringify);
  if (frames.length > 0) {
    script = atomSrc;
    for (var i = 0; i < frames.length; i++) {
      script = this.wrapScriptForFrame(script, frames[i]);
    }
    script += "(" + args.join(',') + ", " + asyncCallBack + ", true )";
  } else {
    logger.info("Executing atom in default context");
    script += "(" + atomSrc + ")(" + args.join(',') + ", " + asyncCallBack + ", true )";
  }
  this.execute(script, function(err, res) {
    if (err) {
      cb(err, {
        status: status.codes.UnknownError.code
        , value: res
      });
    }
  });
};

WebKitRemoteDebugger.prototype.execute = function(command, cb) {
  var me = this;
  if (this.pageLoading) {
    logger.info("Trying to execute but page is not loaded. Waiting for dom");
    this.waitForDom(function() {
      me.execute(command, cb);
    });
  } else {
    var sendJSCommand = messages.sendJSCommand(command, this.appIdKey,
        this.connId, this.senderId, this.pageIdKey);
    this.send(sendJSCommand, cb);
  }
};

WebKitRemoteDebugger.prototype.callFunction = function(objId, fn, args, cb) {
  logger.info("Calling javascript function");
  var callJSFunction = messages.callJSFunction(objId, fn, args, this.appIdKey,
      this.connId, this.senderId, this.pageIdKey);
  this.send(callJSFunction, cb);
};

WebKitRemoteDebugger.prototype.navToUrl = function(url, cb) {
  logger.info("Navigating to new URL: " + url);
  var navToUrl = messages.setUrl(url, this.appIdKey, this.connId,
      this.senderId, this.pageIdKey);
  this.waitForDom(cb);
  this.send(navToUrl, noop);
};

WebKitRemoteDebugger.prototype.pageLoad = function() {
  clearTimeout(this.loadingTimeout);
  var cbs = this.pageLoadedCbs;
  this.pageLoadedCbs = [];
  logger.debug("Page loaded");
  this.pageLoading = false;
  _.each(cbs, function(cb) {
    cb();
  });
};

WebKitRemoteDebugger.prototype.pageUnload = function() {
  logger.debug("Page loading");
  this.pageLoading = true;
  this.waitForDom(noop);
};

WebKitRemoteDebugger.prototype.waitForDom = function(cb) {
  this.pageLoadedCbs.push(cb);
  this.loadingTimeout = setTimeout(this.pageLoad, 60000);
};

// ====================================
// HANDLERS
// ====================================

WebKitRemoteDebugger.prototype.handleMessage = function(data, method) {
 if(method!=null)    {
     var handlerFor = method;
 } else {
     var handlerFor = data.method;
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

WebKitRemoteDebugger.prototype.handleSpecialMessage = function(specialCb) {
  var fn = this.specialCbs[specialCb];
  if (fn) {
    if (specialCb != "_rpc_forwardGetListing:") {
      this.specialCbs[specialCb] = null;
    } else {
    }
    fn.apply(this, _.rest(arguments));
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
      },
    '_rpc_reportSetup:': function (plist) {
      me.handleSpecialMessage('_rpc_reportIdentifier:',
          plist.__argument.WIRSimulatorNameKey,
          plist.__argument.WIRSimulatorBuildKey);
    },
    '_rpc_reportConnectedApplicationList:': function (plist) {
      me.handleSpecialMessage('connect',
          plist.__argument.WIRApplicationDictionaryKey);
    },
    '_rpc_applicationSentListing:': function (plist) {
      me.handleSpecialMessage('_rpc_forwardGetListing:',
          plist.__argument.WIRListingKey);
    },
    '_rpc_applicationSentData:': function(plist) {
      var dataKey = JSON.parse(plist.__argument.WIRMessageDataKey.toString('utf8'))
      , msgId = dataKey.id
      , result = dataKey.result
      , error = dataKey.error || null;
      if (msgId !== null && typeof msgId !== "undefined") {
        msgId = msgId.toString();
      }
      if (dataKey.method == "Profiler.resetProfiles") {
        logger.info("Device is telling us to reset profiles. Should probably " +
                    "do some kind of callback here");
        //me.onPageChange();
      } else if (dataKey.method == "Page.frameNavigated") {
        if (!me.willNavigateWithoutReload) {
          me.pageUnload();
        } else {
          logger.info("Frame navigated but we were warned about it, not " +
                      "considering page state unloaded");
          me.willNavigateWithoutReload = false;
        }
      } else if (dataKey.method == "Page.loadEventFired") {
        me.pageLoad();
      } else if (typeof me.dataCbs[msgId] === "function") {
        me.dataCbs[msgId](error, result);
        me.dataCbs[msgId] = null;
      } else if (me.dataCbs[msgId] === null) {
        logger.error("Debugger returned data for message " + msgId +
                     "but we already ran that callback! WTF??");
      } else {
        if (!msgId && !result && !error) {
          logger.info("Got a blank data response from debugger");
        } else {
          logger.error("Debugger returned data for message " + msgId +
                      " but we weren't waiting for that message! " +
                      " result: " + JSON.stringify(result) +
                      " error: " + error);
        }
      }
    },
    '_rpc_applicationDisconnected:': this.onAppDisconnect
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
    this.socket.send(data);

};


WebKitRemoteDebugger.prototype.receive = function(data){

    var method = null;
    data = JSON.parse(data);

    //check if there was an id
    if(data.id) {
        method = this.dataMethods[data.id];
    }

    //{"result":{"result":{"type":"string","value":"{\"status\":0,\"value\":{\"ELEMENT\":\":wdc:1367936670858\"}}"},"wasThrown":false},"id":2}
    this.handleMessage(data, method);
};

exports.init = function(onDisconnect) {
  return new WebKitRemoteDebugger(onDisconnect);
};
