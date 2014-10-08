"use strict";
/* DEPENDENCIES */

var net = require('net')
  , appLogger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , messages = require('./remote-messages.js')
  , getAtom = require('appium-atoms').get
  , status = require("../../server/status.js")
  , bplistCreate = require('bplist-creator')
  , bplistParse = require('bplist-parser')
  , bufferpack = require('bufferpack')
  , uuid = require('node-uuid')
  , noop = function () {}
  , assert = require('assert');

// ====================================
// CONFIG
// ====================================


var RemoteDebugger = function (onDisconnect) {
  this.init(2, onDisconnect);
};

RemoteDebugger.prototype.init = function (debuggerType, onDisconnect) {
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
  , 'connectedToBadApp': noop
  };
  this.pageLoadedCbs = [];
  this.frameNavigatedCbs = [];
  this.setHandlers();
  this.received = new Buffer(0);
  this.readPos = 0;
  this.debuggerType = debuggerType;
  this.socketGone = false;

  this.logger = {
    info: function (msg) {
      appLogger.info("[REMOTE] " + msg);
    }
  , debug: function (msg) {
      msg = "[REMOTE] " + msg;
      appLogger.debug(msg.grey);
    }
  , error: function (msg) {
      appLogger.error("[REMOTE] " + msg);
    }
  , warn: function (msg) {
      appLogger.warn("[REMOTE] " + msg);
    }
  };

};

// ====================================
// API
// ====================================

RemoteDebugger.prototype.debuggerTypeEnum = {
  "webkit": 1,
  "webinspector": 2
};

RemoteDebugger.prototype.connect = function (cb, pageChangeCb) {
  this.pageChangeCb = pageChangeCb;
  this.socket = new net.Socket({type: 'tcp6'});
  this.socket.on('close', function () {
    this.logger.debug('Debugger socket disconnected');
    this.socketGone = true;
    this.onAppDisconnect();
  }.bind(this));
  this.socket.on('data', this.receive.bind(this));

  var port = process.env.REMOTE_DEBUGGER_PORT || 27753;
  this.socket.connect(port, '::1', function () {
    this.logger.debug("Debugger socket connected to " +
      this.socket.remoteAddress + ':' + this.socket.remotePort);
    this.setConnectionKey(cb);
  }.bind(this));
};

RemoteDebugger.prototype.disconnect = function () {
  this.logger.debug("Disconnecting from remote debugger");
  this.socketGone = true;
  this.socket.destroy();
};

RemoteDebugger.prototype.setConnectionKey = function (cb) {
  try { assert.ok(this.connId); } catch (err) { return cb(err); }
  var setConnKey = messages.setConnectionKey(this.connId);
  this.logger.debug("Sending connection key");
  this.send(setConnKey, function (simNameKey, simBuildKey) {
    this.logger.debug("Sim name: " + simNameKey);
    this.logger.debug("Sim build: " + simBuildKey);
  }.bind(this), function (appDict) {
    var newDict = {};
    _.each(appDict, function (dict) {
      var idKey = dict.WIRApplicationIdentifierKey;
      newDict[idKey] = {
        name: dict.WIRApplicationNameKey,
        bundleId: dict.WIRApplicationBundleIdentifierKey,
        isProxy: dict.WIRIsApplicationProxyKey,
        hostId: dict.WIRHostApplicationIdentifierKey
      };
    }.bind(this));
    cb(newDict);
  });
};

RemoteDebugger.prototype.selectApp = function (appIdKey, cb, tries) {
  if (_.isUndefined(tries)) tries = 1;
  try { assert.ok(this.connId); } catch (err) { return cb(err); }
  this.appIdKey = appIdKey;
  var connectToApp = messages.connectToApp(this.connId, this.appIdKey);
  this.logger.debug("Selecting app " + this.appIdKey);

  var onConnect = function (appIdKey, pageDict) {
    // appIdKey comes in but we trust that it's the same here, otherwise
    // we'll stall out and not call cb
    cb(this.pageArrayFromDict(pageDict));
    this.specialCbs['_rpc_forwardGetListing:'] = this.onPageChange.bind(this);
  }.bind(this);

  var onConnectToBadApp = function (correctAppIdKey) {
    if (tries < 4) {
      this.logger.info("We were notified we connected to possibly the wrong " +
                       "app. Using the id key suggested and trying again");
      this.selectApp(correctAppIdKey, cb, tries + 1);
    } else {
      var msg = "Could not connect to a valid app after " + tries + " tries.";
      this.logger.error(msg);
      cb(new Error(msg));
    }
  }.bind(this);

  this.send(connectToApp, onConnect, onConnectToBadApp);
};

RemoteDebugger.prototype.pageArrayFromDict = function (pageDict) {
  var newPageArray = [];
  _.each(pageDict, function (dict) {
    // count only WIRTypeWeb pages and ignore all others (WIRTypeJavaScript etc)
    if (dict.WIRTypeKey === 'WIRTypeWeb') {
      newPageArray.push({
        id: dict.WIRPageIdentifierKey
      , title: dict.WIRTitleKey
      , url: dict.WIRURLKey
      , isKey: typeof dict.WIRConnectionIdentifierKey !== "undefined"
      });
    }
  });
  return newPageArray;
};

RemoteDebugger.prototype.selectPage = function (pageIdKey, cb, skipReadyCheck) {
  if (typeof skipReadyCheck === "undefined") {
    skipReadyCheck = false;
  }
  try {
    assert.ok(this.connId);
    assert.ok(this.appIdKey);
    assert.ok(this.senderId);
  } catch (err) { return cb(err); }

  this.pageIdKey = pageIdKey;
  var setSenderKey = messages.setSenderKey(this.connId, this.appIdKey,
                                           this.senderId, this.pageIdKey);
  this.logger.debug("Selecting page " + pageIdKey + " and forwarding socket setup");
  this.send(setSenderKey, function () {
    this.logger.debug("Set sender key");
    var enablePage = messages.enablePage(this.appIdKey, this.connId,
                                         this.senderId, this.pageIdKey, this.debuggerType);
    this.send(enablePage, function () {
      this.logger.debug("Enabled activity on page");
      if (skipReadyCheck) {
        cb();
      } else {
        this.checkPageIsReady(function (err, isReady) {
          if (!isReady) {
            return this.pageUnload(cb);
          }
          cb();
        }.bind(this));
      }
    }.bind(this));
  }.bind(this));
};

RemoteDebugger.prototype.checkPageIsReady = function (cb) {
  this.logger.debug("Checking document readyState");
  var readyCmd = '(function (){return document.readyState;})()';
  this.execute(readyCmd, function (err, res) {
    if (err) {
      this.logger.debug("readyState returned error, calling it not ready");
      return cb(null, false);
    } else {
      this.logger.debug("readyState was " + res.result.value);
      return cb(null, res.result.value === "complete");
    }
  }.bind(this), true);
};

RemoteDebugger.prototype.onPageChange = function (appIdKey, pageDict) {
  if (this.appIdKey !== appIdKey) {
    this.logger.debug("New page listing did not match the app id we " +
                      "are currently using, ignoring");
    return;
  }
  this.pageChangeCb(this.pageArrayFromDict(pageDict));
};

RemoteDebugger.prototype.wrapScriptForFrame = function (script, frame) {
  var elFromCache = getAtom('get_element_from_cache')
    , wrapper = "";
  this.logger.debug("Wrapping script for frame " + frame);
  frame = JSON.stringify(frame);
  wrapper += "(function (window) { var document = window.document; ";
  wrapper += "return (" + script + ");";
  wrapper += "})((" + elFromCache + ")(" + frame + "))";
  return wrapper;
};

RemoteDebugger.prototype.executeAtom = function (atom, args, frames, cb) {
  var atomSrc, script = "";
  atomSrc = getAtom(atom);
  args = _.map(args, JSON.stringify);
  if (frames.length > 0) {
    script = atomSrc;
    for (var i = 0; i < frames.length; i++) {
      script = this.wrapScriptForFrame(script, frames[i]);
    }
    script += "(" + args.join(',') + ")";
  } else {
    this.logger.debug("Executing '" + atom + "' atom in default context");
    script += "(" + atomSrc + ")(" + args.join(',') + ")";
  }
  this.execute(script, function (err, res) {
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

RemoteDebugger.prototype.executeAtomAsync = function (atom, args, frames, responseUrl, cb) {
  var atomSrc, script = ""
    , asyncCallBack = "";

  asyncCallBack += "function (res) { xmlHttp = new XMLHttpRequest(); xmlHttp.open('POST', '" + responseUrl + "', true);";
  asyncCallBack += "xmlHttp.setRequestHeader('Content-type','application/json'); xmlHttp.send(res); }";

  atomSrc = getAtom(atom);
  args = _.map(args, JSON.stringify);
  if (frames.length > 0) {
    script = atomSrc;
    for (var i = 0; i < frames.length; i++) {
      script = this.wrapScriptForFrame(script, frames[i]);
    }
    script += "(" + args.join(',') + ", " + asyncCallBack + ", true )";
  } else {
    this.logger.debug("Executing atom in default context");
    script += "(" + atomSrc + ")(" + args.join(',') + ", " + asyncCallBack + ", true )";
  }
  this.execute(script, function (err, res) {
    if (err) {
      cb(err, {
        status: status.codes.UnknownError.code
      , value: res
      });
    }
  });
};

RemoteDebugger.prototype.execute = function (command, cb, override) {
  if (this.pageLoading && !override) {
    this.logger.debug("Trying to execute but page is not loaded. Waiting for dom");
    this.waitForDom(function () {
      this.execute(command, cb);
    }.bind(this));
  } else {
    if (this.debuggerType === this.debuggerTypeEnum.webinspector) {
      try {
        assert.ok(this.connId);
        assert.ok(this.appIdKey);
        assert.ok(this.senderId);
        //assert.ok(this.pageIdKey);
      } catch (err) { return cb(err); }
    }
    this.logger.debug("Sending javascript command");
    var sendJSCommand = messages.sendJSCommand(command, this.appIdKey,
        this.connId, this.senderId, this.pageIdKey, this.debuggerType);
    this.send(sendJSCommand, cb);
  }
};

RemoteDebugger.prototype.callFunction = function (objId, fn, args, cb) {
  try {
    assert.ok(this.connId);
    assert.ok(this.appIdKey);
    assert.ok(this.senderId);
    assert.ok(this.pageIdKey);
  } catch (err) { return cb(err); }

  this.logger.debug("Calling javascript function");
  var callJSFunction = messages.callJSfunction(objId, fn, args, this.appIdKey,
      this.connId, this.senderId, this.pageIdKey, this.debuggerType);
  this.send(callJSFunction, cb);
};

RemoteDebugger.prototype.navToUrl = function (url, cb) {
  if (this.debuggerType === this.debuggerTypeEnum.webinspector) {
    try {
      assert.ok(this.connId);
      assert.ok(this.appIdKey);
      assert.ok(this.senderId);
      assert.ok(this.pageIdKey);
    } catch (err) { return cb(err); }
  }
  this.logger.debug("Navigating to new URL: " + url);
  var navToUrl = messages.setUrl(url, this.appIdKey, this.connId,
      this.senderId, this.pageIdKey, this.debuggerType);
  this.send(navToUrl, noop);
  setTimeout(function () {
    this.waitForFrameNavigated(function () {
      this.waitForDom(cb);
    }.bind(this));
  }.bind(this), 1000);
};

RemoteDebugger.prototype.pageLoad = function () {
  clearTimeout(this.loadingTimeout);
  var cbs = this.pageLoadedCbs
    , waitMs = 60000
    , intMs = 500
    , start = Date.now();
  this.logger.debug("Page loaded, verifying whether ready through readyState");
  var verify = function () {
    this.checkPageIsReady(function (err, isReady) {
      if (isReady || (start + waitMs) < Date.now()) {
        this.logger.debug("Page is ready, calling onload cbs");
        this.pageLoadedCbs = [];
        this.pageLoading = false;
        _.each(cbs, function (cb) {
          cb();
        });
      } else {
        this.logger.debug("Page was not ready, retrying");
        this.loadingTimeout = setTimeout(verify, intMs);
      }
    }.bind(this));
  }.bind(this);
  this.loadingTimeout = setTimeout(verify, intMs);
};

RemoteDebugger.prototype.startTimeline = function (fn, cb) {
  this.logger.debug("Starting to record the timeline");
  this.timelineEventHandler = fn;
  var sendJSCommand = messages.startTimeline(this.appIdKey,
        this.connId, this.senderId, this.pageIdKey, this.debuggerType);
  this.send(sendJSCommand, cb);
};

RemoteDebugger.prototype.stopTimeline = function (cb) {
  this.logger.debug("Stopping to record the timeline");
  var sendJSCommand = messages.stopTimeline(this.appIdKey,
        this.connId, this.senderId, this.pageIdKey, this.debuggerType);
  this.send(sendJSCommand, cb);
};

RemoteDebugger.prototype.timelineEventRecorded = function (result) {
  this.timelineEventHandler(result);
};

RemoteDebugger.prototype.cancelPageLoad = function () {
  this.logger.debug("Unregistering from page readiness notifications");
  this.pageLoadedCbs = [];
  this.pageLoading = false;
  clearTimeout(this.loadingTimeout);
};

RemoteDebugger.prototype.frameNavigated = function () {
  this.logger.debug("Frame navigated, calling cbs");
  clearTimeout(this.navigatingTimeout);
  var cbs = this.frameNavigatedCbs;
  this.frameNavigatedCbs = [];
  _.each(cbs, function (cb) {
    cb();
  });
};

RemoteDebugger.prototype.pageUnload = function (cb) {
  if (typeof cb === "undefined") cb = null;
  this.logger.debug("Page loading");
  this.pageLoading = true;
  this.waitForDom(cb);
};

RemoteDebugger.prototype.waitForDom = function (cb) {
  this.logger.debug("Waiting for dom...");
  if (typeof cb === "function") {
    this.pageLoadedCbs.push(_.once(cb));
  }
  this.pageLoad();
};

RemoteDebugger.prototype.waitForFrameNavigated = function (cb) {
  this.logger.debug("Waiting for frame navigated...");
  this.frameNavigatedCbs.push(cb);
  this.navigatingTimeout = setTimeout(this.frameNavigated.bind(this), 500);
};

// ====================================
// HANDLERS
// ====================================

RemoteDebugger.prototype.handleMessage = function (plist) {
  var handlerFor = plist.__selector;
  if (!handlerFor) {
    this.logger.debug("Got an invalid plist");
    return;
  }
  if (_.has(this.handlers, handlerFor)) {
    this.handlers[handlerFor](plist);
  } else {
    this.logger.debug("Debugger got a message for '" + handlerFor + "' and have no " +
                "handler, doing nothing.");
  }
};

RemoteDebugger.prototype.handleSpecialMessage = function (specialCb) {
  var fn = this.specialCbs[specialCb];
  if (fn) {
    if (specialCb !== "_rpc_forwardGetListing:") {
      this.specialCbs[specialCb] = null;
    }
    fn.apply(this, _.rest(arguments));
  }
};

RemoteDebugger.prototype.setHandlers = function () {
  this.handlers = {
    '_rpc_reportSetup:': function (plist) {
      this.handleSpecialMessage('_rpc_reportIdentifier:',
          plist.__argument.WIRSimulatorNameKey,
          plist.__argument.WIRSimulatorBuildKey);
    }.bind(this),
    '_rpc_reportConnectedApplicationList:': function (plist) {
      this.handleSpecialMessage('connect',
          plist.__argument.WIRApplicationDictionaryKey);
    }.bind(this),
    '_rpc_applicationSentListing:': function (plist) {
      this.handleSpecialMessage('_rpc_forwardGetListing:',
          plist.__argument.WIRApplicationIdentifierKey,
          plist.__argument.WIRListingKey);
    }.bind(this),
    '_rpc_applicationConnected:': function (plist) {
      this.handleSpecialMessage('connectedToBadApp',
          plist.__argument.WIRApplicationIdentifierKey);
    }.bind(this),
    '_rpc_applicationSentData:': function (plist) {
      var dataKey = JSON.parse(plist.__argument.WIRMessageDataKey.toString('utf8'))
      , msgId = dataKey.id
      , result = dataKey.result
      , error = dataKey.error || null;
      if (msgId !== null && typeof msgId !== "undefined") {
        msgId = msgId.toString();
      }
      if (dataKey.method === "Profiler.resetProfiles") {
        this.logger.debug("Device is telling us to reset profiles. Should probably " +
                    "do some kind of callback here");
      } else if (dataKey.method === "Page.frameNavigated") {
        if (!this.willNavigateWithoutReload && !this.pageLoading) {
          this.logger.debug("Frame navigated, unloading page");
          this.frameNavigated();
        } else {
          this.logger.debug("Frame navigated but we were warned about it, not " +
                      "considering page state unloaded");
          this.willNavigateWithoutReload = false;
        }
      } else if (dataKey.method === "Page.loadEventFired") {
        this.pageLoad();
      } else if (dataKey.method === "Timeline.eventRecorded") {
        this.timelineEventRecorded(dataKey.params.record);
      } else if (typeof this.dataCbs[msgId] === "function") {
        this.dataCbs[msgId](error, result);
        this.dataCbs[msgId] = null;
      } else if (this.dataCbs[msgId] === null) {
        this.logger.error("Debugger returned data for message " + msgId +
                     "but we already ran that callback! WTF??");
      } else {
        if (!msgId && !result && !error) {
          this.logger.debug("Got a blank data response from debugger");
        } else {
          this.logger.error("Debugger returned data for message " + msgId +
                      " but we weren't waiting for that message! " +
                      " result: " + JSON.stringify(result) +
                      " error: " + error);
        }
      }
    }.bind(this),
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
    if (data.__selector === '_rpc_reportIdentifier:') {
      this.specialCbs.connect = cb2;
    } else if (data.__selector === '_rpc_forwardGetListing') {
      this.specialCbs.connectedToBadApp = cb2;
    }
  } else if (data.__argument && data.__argument.WIRSocketDataKey) {
    this.curMsgId += 1;
    this.dataCbs[this.curMsgId.toString()] = cb;
    data.__argument.WIRSocketDataKey.id = this.curMsgId;
    data.__argument.WIRSocketDataKey = new
      Buffer(JSON.stringify(data.__argument.WIRSocketDataKey));
  } else {
    immediateCb = true;
  }

  this.logger.debug("Sending " + data.__selector + " message to remote debugger");
  if (data.__selector !== "_rpc_forwardSocketData:") {
    this.logger.debug(JSON.stringify(data));
  }

  try {
    plist = bplistCreate(data);
  } catch (e) {
    this.logger.error("Could not create binary plist from data");
    return this.logger.debug(e);
  }

  if (!this.socketGone) {
    this.socket.write(bufferpack.pack('L', [plist.length]));
    this.socket.write(plist, immediateCb ? cb : noop);
  } else {
    this.logger.error("Attempted to write data to socket after it was closed!");
  }
};

RemoteDebugger.prototype.receive = function (data) {
  var dataLeftOver, oldReadPos, prefix, msgLength, body, plist, chunk, leftOver;
  this.logger.debug('Receiving data from remote debugger');

  // Append this new data to the existing Buffer
  this.received = Buffer.concat([this.received, data]);
  dataLeftOver = true;

  // Parse multiple messages in the same packet
  while (dataLeftOver) {

    // Store a reference to where we were
    oldReadPos = this.readPos;

    // Read the prefix (plist length) to see how far to read next
    // It's always 4 bytes long
    prefix = this.received.slice(this.readPos, this.readPos + 4);

    try {
      msgLength = bufferpack.unpack('L', prefix)[0];
    } catch (e) {
      this.logger.error("Butter could not unpack");
      return this.logger.debug(e);
    }

    // Jump forward 4 bytes
    this.readPos += 4;

    // Is there enough data here?
    // If not, jump back to our original position and gtfo
    if (this.received.length < msgLength + this.readPos) {
      this.readPos = oldReadPos;
      break;
    }

    // Extract the main body of the message (where the plist should be)
    body = this.received.slice(this.readPos, msgLength + this.readPos);

    // Extract the plist
    try {
      plist = bplistParse.parseBuffer(body);
    } catch (e) {
      this.logger.error("Error parsing binary plist");
      this.logger.debug(e);
    }

    // bplistParse.parseBuffer returns an array
    if (plist.length === 1) {
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
      this.logger.debug("got applicationSentData response");
    } else {
      this.logger.debug(JSON.stringify(plistCopy));
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

exports.init = function (onDisconnect) {
  return new RemoteDebugger(onDisconnect);
};

exports.RemoteDebugger = RemoteDebugger;
