"use strict";
/* DEPENDENCIES */

var net = require('net')
  , appLogger = require('../../../logger.js').get('appium')
  , _ = require('underscore')
  , messages = require('./remote-messages.js')
  , atoms = require('./webdriver-atoms')
  , status = require("../../uiauto/lib/status")
  , bplistCreate = require('node-bplist-creator')
  , bplistParse = require('bplist-parser')
  , bufferpack = require('bufferpack')
  , uuid = require('node-uuid')
  , colors = require('colors')
  , noop = function () {}
  , assert = require('assert')
  , util = require('util');

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


var RemoteDebugger = function(onDisconnect) {
  this.socket = null;
  this.connId = uuid.v4();
  this.senderId = uuid.v4();
  this.appIdKey = null;
  this.pageIdKey = null;
  this.pageLoading = false;
  this.curMsgId = 0;
  this.dataCbs = {};
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
};

// ====================================
// API
// ====================================

RemoteDebugger.prototype.connect = function(cb, pageChangeCb) {
  var me = this;
  this.pageChangeCb = pageChangeCb;
  this.socket = new net.Socket({type: 'tcp6'});
  this.socket.on('close', function() {
    logger.info('Debugger socket disconnected');
    me.onAppDisconnect();
  });
  this.socket.on('data', _.bind(me.receive, this));

  this.socket.connect(27753, '::1', function () {
    logger.info("Debugger socket connected to " + me.socket.remoteAddress +
                ':' + me.socket.remotePort);
    me.setConnectionKey(cb);
  });
};

RemoteDebugger.prototype.disconnect = function() {
  logger.info("Disconnecting from remote debugger");
  this.socket.destroy();
};

RemoteDebugger.prototype.setConnectionKey = function(cb) {
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

RemoteDebugger.prototype.selectApp = function(appIdKey, cb) {
  assert.ok(this.connId);
  this.appIdKey = appIdKey;
  var connectToApp = messages.connectToApp(this.connId, this.appIdKey);
  logger.info("Selecting app");
  this.send(connectToApp, _.bind(function(pageDict) {
    cb(this.pageArrayFromDict(pageDict));
    this.specialCbs['_rpc_forwardGetListing:'] = _.bind(this.onPageChange, this);
  }, this));
};

RemoteDebugger.prototype.pageArrayFromDict = function(pageDict) {
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

RemoteDebugger.prototype.selectPage = function(pageIdKey, cb, skipReadyCheck) {
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

RemoteDebugger.prototype.onPageChange = function(pageDict) {
  this.pageChangeCb(this.pageArrayFromDict(pageDict));
};

RemoteDebugger.prototype.wrapScriptForFrame = function(script, frame) {
    var elFromCache = atoms.get('get_element_from_cache')
      , wrapper = "";
    logger.info("Wrapping script for frame " + frame);
    frame = JSON.stringify(frame);
    wrapper += "(function(window) { var document = window.document; ";
    wrapper += "return (" + script + ");";
    wrapper += "})((" + elFromCache + ")(" + frame + "))";
    return wrapper;
};

RemoteDebugger.prototype.wrapElementEqualsElementAtom = function(args) {
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

RemoteDebugger.prototype.wrapJsEventAtom = function(args) {
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

RemoteDebugger.prototype.executeAtom = function(atom, args, frames, cb) {
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

RemoteDebugger.prototype.executeAtomAsync = function(atom, args, frames, responseUrl, cb) {
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

RemoteDebugger.prototype.execute = function(command, cb) {
  var me = this;
  if (this.pageLoading) {
    logger.info("Trying to execute but page is not loaded. Waiting for dom");
    this.waitForDom(function() {
      me.execute(command, cb);
    });
  } else {
    assert.ok(this.connId); assert.ok(this.appIdKey); assert.ok(this.senderId);
    assert.ok(this.pageIdKey);
    logger.info("Sending javascript command");
    var sendJSCommand = messages.sendJSCommand(command, this.appIdKey,
        this.connId, this.senderId, this.pageIdKey);
    this.send(sendJSCommand, cb);
  }
};

RemoteDebugger.prototype.callFunction = function(objId, fn, args, cb) {
  assert.ok(this.connId); assert.ok(this.appIdKey); assert.ok(this.senderId);
  assert.ok(this.pageIdKey);
  logger.info("Calling javascript function");
  var callJSFunction = messages.callJSFunction(objId, fn, args, this.appIdKey,
      this.connId, this.senderId, this.pageIdKey);
  this.send(callJSFunction, cb);
};

RemoteDebugger.prototype.navToUrl = function(url, cb) {
  assert.ok(this.connId); assert.ok(this.appIdKey); assert.ok(this.senderId);
  assert.ok(this.pageIdKey);
  logger.info("Navigating to new URL: " + url);
  var navToUrl = messages.setUrl(url, this.appIdKey, this.connId,
      this.senderId, this.pageIdKey);
  this.waitForDom(cb);
  this.send(navToUrl, noop);
};

RemoteDebugger.prototype.pageLoad = function() {
  clearTimeout(this.loadingTimeout);
  var cbs = this.pageLoadedCbs;
  this.pageLoadedCbs = [];
  logger.debug("Page loaded");
  this.pageLoading = false;
  _.each(cbs, function(cb) {
    cb();
  });
};

RemoteDebugger.prototype.pageUnload = function() {
  logger.debug("Page loading");
  this.pageLoading = true;
  this.waitForDom(noop);
};

RemoteDebugger.prototype.waitForDom = function(cb) {
  this.pageLoadedCbs.push(cb);
  this.loadingTimeout = setTimeout(this.pageLoad, 60000);
};

// ====================================
// HANDLERS
// ====================================

RemoteDebugger.prototype.handleMessage = function(plist) {
  var handlerFor = plist.__selector;
  if (!handlerFor) {
    logger.debug("Got an invalid plist");
    return;
  }
  if (_.has(this.handlers, handlerFor)) {
    this.handlers[handlerFor](plist);
  } else {
    logger.info("Debugger got a message for '" + handlerFor + "' and have no " +
                "handler, doing nothing.");
  }
};

RemoteDebugger.prototype.handleSpecialMessage = function(specialCb) {
  var fn = this.specialCbs[specialCb];
  if (fn) {
    if (specialCb != "_rpc_forwardGetListing:") {
      this.specialCbs[specialCb] = null;
    } else {
    }
    fn.apply(this, _.rest(arguments));
  }
};

RemoteDebugger.prototype.setHandlers = function() {
  var me = this;
  this.handlers = {
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

RemoteDebugger.prototype.send = function (data, cb, cb2) {
  var immediateCb = false
    , plist;

  cb = cb || noop;
  cb2 = cb2 || noop;

  if (_.has(this.specialCbs, data.__selector)) {
    this.specialCbs[data.__selector] = cb;
    if (data.__selector == '_rpc_reportIdentifier:') {
      this.specialCbs.connect = cb2;
    }
  } else if( data.__argument && data.__argument.WIRSocketDataKey ) {
    //console.log("MsgId was " + this.curMsgId);
    this.curMsgId += 1;
    //console.log("Giving message new id of " + this.curMsgId);
    this.dataCbs[this.curMsgId.toString()] = cb;
    //_.each(this.dataCbs, function(cb, msgId) {
      //console.log(msgId + ": " + cb);
    //});
    //console.log(JSON.stringify(this.dataCbs));
    data.__argument.WIRSocketDataKey.id = this.curMsgId;
    data.__argument.WIRSocketDataKey = new
      Buffer(JSON.stringify(data.__argument.WIRSocketDataKey));
  } else {
    immediateCb = true;
  }

  logger.debug("Sending " + data.__selector + " message to remote debugger");
  if (data.__selector !== "_rpc_forwardSocketData:") {
    logger.debug(util.inspect(data, false, null));
  }

  try {
    plist = bplistCreate(data);
  } catch(e) {
    logger.error("Could not create binary plist from data");
    return logger.info(e);
  }

  this.socket.write(bufferpack.pack('L', [plist.length]));
  this.socket.write(plist, immediateCb ? cb : noop);
};

RemoteDebugger.prototype.receive = function(data) {
  var dataLeftOver, oldReadPos, prefix, msgLength, body, plist, chunk, leftOver;
  logger.debug('Receiving data from remote debugger');

  // Append this new data to the existing Buffer
  this.received = Buffer.concat([this.received, data]);
  dataLeftOver = true;

  // Parse multiple messages in the same packet
  while(dataLeftOver) {

    // Store a reference to where we were
    oldReadPos = this.readPos;

    // Read the prefix (plist length) to see how far to read next
    // It's always 4 bytes long
    prefix = this.received.slice(this.readPos, this.readPos + 4);

    try {
      msgLength = bufferpack.unpack('L', prefix)[0];
    } catch(e) {
      logger.error("Butter could not unpack");
      return logger.info(e);
    }

    // Jump forward 4 bytes
    this.readPos += 4;

    // Is there enough data here?
    // If not, jump back to our original position and gtfo
    if( this.received.length < msgLength + this.readPos ) {
      this.readPos = oldReadPos;
      break;
    }

    // Extract the main body of the message (where the plist should be)
    body = this.received.slice(this.readPos, msgLength + this.readPos);

    // Extract the plist
    try {
      plist = bplistParse.parseBuffer(body);
    } catch (e) {
      logger.error("Error parsing binary plist");
      logger.info(e);
    }

    // bplistParse.parseBuffer returns an array
    if( plist.length === 1 ) {
      plist = plist[0];
    }

    var plistCopy = plist;
    if (typeof plistCopy.WIRMessageDataKey !== "undefined") {
      plistCopy.WIRMessageDataKey = plistCopy.WIRMessageDataKey.toString("utf8");
    }
    if (typeof plistCopy.WIRDestinationKey !== "undefined") {
      plistCopy.WIRDestinationKey = plistCopy.WIRDestinationKey.toString("utf8");
    }
    if (typeof plistCopy.WIRSocketDataKey !== "undefined") {
      plistCopy.WIRSocketDataKey = plistCopy.WIRSocketDataKey.toString("utf8");
    }

    if (plistCopy.__selector === "_rpc_applicationSentData:") {
      logger.debug("<applicationSentData response>");
    } else {
      logger.debug(util.inspect(plistCopy, false, null));
    }

    // Jump forward the length of the plist
    this.readPos += msgLength;

    // Calculate how much buffer is left
    leftOver = this.received.length - this.readPos;

    // Is there some left over?
    if (leftOver !== 0) {
      // Copy what's left over into a new buffer, and save it for next time
      chunk = new Buffer(leftOver);
      this.received.copy(chunk, 0, this.readPos);
      this.received = chunk;
    } else {
      // Otherwise, empty the buffer and get out of the loop
      this.received = new Buffer(0);
      dataLeftOver = false;
    }

    // Reset the read position
    this.readPos = 0;

    // Now do something with the plist
    if (plist) {
      this.handleMessage(plist);
    }

  }
};

exports.init = function(onDisconnect) {
  return new RemoteDebugger(onDisconnect);
};
