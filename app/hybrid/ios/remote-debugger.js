"use strict";
/* DEPENDENCIES */

var net = require('net')
  , appLogger = require('../../../logger.js').get('appium')
  , _ = require('underscore')
  , messages = require('./remote-messages.js')
  , atoms = require('./webdriver-atoms')
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
  this.curMsgId = 0;
  this.dataCbs = [];
  this.onAppDisconnect = onDisconnect || noop;
  this.specialCbs = {
    '_rpc_reportIdentifier:': noop
    , '_rpc_forwardGetListing:': noop
    , 'connect': noop
  };
  this.setHandlers();
  this.received = new Buffer(0);
  this.readPos = 0;
};

// ====================================
// API
// ====================================

RemoteDebugger.prototype.connect = function(cb) {
  var me = this;
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
  this.socket.close();
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
  this.send(connectToApp, function(pageDict) {
    var newPageArray = [];
    _.each(pageDict, function(dict) {
      newPageArray.push({
        id: dict.WIRPageIdentifierKey
        , title: dict.WIRTitleKey
        , url: dict.WIRURLKey
      });
    });
    cb(newPageArray);
  });
};

RemoteDebugger.prototype.selectPage = function(pageIdKey, cb) {
  assert.ok(this.connId); assert.ok(this.appIdKey); assert.ok(this.senderId);
  this.pageIdKey = pageIdKey;
  var setSenderKey = messages.setSenderKey(this.connId, this.appIdKey,
      this.senderId, this.pageIdKey);
  logger.info("Selecting page and forwarding socket setup");
  this.send(setSenderKey, cb);
};

RemoteDebugger.prototype.executeAtom = function(atom, args, cb) {
  var atomSrc = atoms.get(atom);
  args = _.map(args, JSON.stringify);
  this.execute(['(',atomSrc,')(',args.join(','),')'].join(''), cb);
};

RemoteDebugger.prototype.execute = function(command, cb) {
  assert.ok(this.connId); assert.ok(this.appIdKey); assert.ok(this.senderId);
  assert.ok(this.pageIdKey);
  logger.info("Sending javascript command");
  var sendJSCommand = messages.sendJSCommand(command, this.appIdKey,
      this.connId, this.senderId, this.pageIdKey);
  this.send(sendJSCommand, cb);
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
  this.send(navToUrl, cb);
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
    this.specialCbs[specialCb] = null;
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
      if (dataKey.method == "Profiler.resetProfiles") {
        logger.info("Device is telling us to reset profiles. Should probably " +
                    "do some kind of callback here");
      } else if (typeof me.dataCbs[msgId] === "function") {
        me.dataCbs[msgId](error, result);
      } else {
        logger.error("Debugger returned data for message " + msgId +
                     "but we weren't waiting for that message!");
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
    this.curMsgId += 1;
    this.dataCbs[this.curMsgId] = cb;
    data.__argument.WIRSocketDataKey.id = this.curMsgId;
    data.__argument.WIRSocketDataKey = new
      Buffer(JSON.stringify(data.__argument.WIRSocketDataKey));
  } else {
    immediateCb = true;
  }

  logger.debug("Sending message to remote debugger:");
  logger.debug(util.inspect(data, false, null));

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

    logger.debug(util.inspect(plist, false, null));

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
