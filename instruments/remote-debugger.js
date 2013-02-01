"use strict";
/* DEPENDENCIES */

var net = require('net')
  , logger = require('../logger.js').get('appium')
  , _ = require('underscore')
  , bplist_create = require('node-bplist-creator')
  , bplist_parse = require('bplist-parser')
  , bufferpack = require('bufferpack')
  , uuid = require('node-uuid')
  , colors = require('colors')
  , util = require('util');

var noop = function () {};

// ====================================
// CONFIG
// ====================================

var socket = new net.Socket({type: 'tcp6'});
var conn_id = uuid.v4();
var sender_id = uuid.v4();

// ====================================
// SENDING
// ====================================

var msg_id = 0;
var dataCbs = [];
var specialCbs = {
  '_rpc_reportIdentifier:': noop
  , '_rpc_forwardGetListing:': noop
  //, '_rpc_forwardIndicateWebView:': noop
  //, '_rpc_forwardSocketSetup:': noop
  , 'connect': noop
};
var raw_send = function (socket, data, cb, cb2) {

  cb = cb || noop;
  cb2 = cb2 || noop;
  var immediateCb = false;

  if (_.has(specialCbs, data.__selector)) {
    specialCbs[data.__selector] = cb;
    if (data.__selector == '_rpc_reportIdentifier:') {
      specialCbs.connect = cb2;
    }
  } else if( data.__argument && data.__argument.WIRSocketDataKey ) {
    msg_id += 1;
    dataCbs[msg_id] = cb;
    data.__argument.WIRSocketDataKey.id = msg_id;
    data.__argument.WIRSocketDataKey = new Buffer(JSON.stringify(data.__argument.WIRSocketDataKey));
  } else {
    immediateCb = true;
  }

  logger.info('out ====================================='.blue);
  logger.info(util.inspect(data, false, null));

  var plist;
  try {
    plist = bplist_create(data);
  } catch(e) {
    return logger.info(e);
  }

  socket.write(bufferpack.pack('L', [plist.length]));
  socket.write(plist, immediateCb ? cb : noop);
};

var send = function () {
  logger.info("Send called before initialised.");
};

// ====================================
// MESSAGES
// ====================================

var msg = {};

// Connection

msg.set_connection_key = {
  __argument: {
    WIRConnectionIdentifierKey: conn_id
  },
  __selector : '_rpc_reportIdentifier:'
};

msg.connect_to_app = {
  __argument: {
    WIRConnectionIdentifierKey: conn_id,
    WIRApplicationIdentifierKey: 'com.apple.mobilesafari'
  },
  __selector : '_rpc_forwardGetListing:'
};

msg.set_sender_key = {
  __argument: {
    WIRApplicationIdentifierKey: 'com.apple.mobilesafari',
    WIRConnectionIdentifierKey: conn_id,
    WIRSenderKey: sender_id,
    WIRPageIdentifierKey: 1
  },
  __selector: '_rpc_forwardSocketSetup:'
};

// Action

msg.indicate_web_view_true = {
  __argument: {
    WIRApplicationIdentifierKey: 'com.apple.mobilesafari',
    WIRIndicateEnabledKey: true,
    WIRConnectionIdentifierKey: conn_id,
    WIRPageIdentifierKey: 1
  },
  __selector: '_rpc_forwardIndicateWebView:'
};

msg.indicate_web_view_false = {
  __argument: {
    WIRApplicationIdentifierKey: 'com.apple.mobilesafari',
    WIRIndicateEnabledKey: false,
    WIRConnectionIdentifierKey: conn_id,
    WIRPageIdentifierKey: 1
  },
  __selector: '_rpc_forwardIndicateWebView:'
};

msg.enable_inspector = {
  __argument: {
    WIRApplicationIdentifierKey: 'com.apple.mobilesafari',
    WIRSocketDataKey: {
      method: "Inspector.enable"
    },
    WIRConnectionIdentifierKey: conn_id,
    WIRSenderKey: sender_id,
    WIRPageIdentifierKey: 1
  },
  __selector: '_rpc_forwardSocketData:'
};

msg.send_alert = {
  __argument: {
    WIRApplicationIdentifierKey: 'com.apple.mobilesafari',
    WIRSocketDataKey: {
      method: "Runtime.evaluate",
      params: {
        expression: 'document.title;',
        //objectGroup: "console",
        //includeCommandLineAPI: true,
        //doNotPauseOnExceptionsAndMuteConsole: true,
        returnByValue: true
      }
    },
    WIRConnectionIdentifierKey: conn_id,
    WIRSenderKey: sender_id,
    WIRPageIdentifierKey: 1
  },
  __selector: '_rpc_forwardSocketData:'
};


// ====================================
// HANDLERS
// ====================================

var handlers = {
  _rpc_reportSetup: function (plist) {
    var fn = specialCbs['_rpc_reportIdentifier:'];
    if (fn) {
      specialCbs['_rpc_reportIdentifier:'] = null;
      fn(plist.__argument.WIRSimulatorNameKey,
              plist.__argument.WIRSimulatorBuildKey);
    }
  },
  _rpc_reportConnectedApplicationList: function (plist) {
    var fn = specialCbs.connect;
    if (fn) {
      specialCbs.connect = null;
      fn(plist.__argument.WIRApplicationDictionaryKey);
    }
  },
  _rpc_applicationSentListing: function (plist) {
    var fn = specialCbs['_rpc_forwardGetListing:'];
    if (fn) {
      specialCbs['_rpc_forwardGetListing:'] = null;
      fn(plist.__argument.WIRListingKey);
    }
  },
  _rpc_applicationSentData: function(plist) {
    var msgId = plist.__argument.WIRMessageDataKey.id;
    dataCbs[msgId](plist.__argument.WIRMessageDataKey.result);
  },
  _rpc_applicationDisconnected: function (plist) {
    process.exit(0);
  }
};

var handle = function (plist) {
  if( ! plist.__selector ) return;
  var selector = plist.__selector.slice(0, -1);

  logger.info('handle'.cyan, plist);

  (handlers[selector] || noop)(plist);
};

// ====================================
// SOCKET
// ====================================

var recieved = new Buffer(0);
var read_pos = 0;

socket.on('data', function (data) {

  logger.info('in ======================================='.red);

  // Append this new data to the existing Buffer
  recieved = Buffer.concat([recieved, data]);

  var data_left_over = true;

  // Parse multiple messages in the same packet
  while( data_left_over ) {

    // Store a reference to where we were
    var old_read_pos = read_pos;

    // Read the prefix (plist length) to see how far to read next
    // It's always 4 bytes long
    var prefix = recieved.slice(read_pos, read_pos + 4);
    var msg_length;

    try {
      msg_length = bufferpack.unpack('L', prefix)[0];
    } catch(e) {
      logger.error("Butter could not unpack");
      return logger.info(e);
    }

    // Jump forward 4 bytes
    read_pos += 4;

    // Is there enough data here?
    // If not, jump back to our original position and gtfo
    if( recieved.length < msg_length + read_pos ) {
      read_pos = old_read_pos;
      break;
    }

    // Extract the main body of the message (where the plist should be)
    var body = recieved.slice(read_pos, msg_length + read_pos);

    // Extract the plist
    var plist;
    try {
      plist = bplist_parse.parseBuffer(body);
    } catch (e) {
      logger.error("ERror parsing binary plist");
      logger.info(e);
    }

    // bplist_parse.parseBuffer returns an array
    if( plist.length === 1 ) {
      plist = plist[0];
    }

    logger.info('plist ===================================='.green);
    logger.info(
      util.inspect(plist, false, null)
    );
    logger.info('=========================================='.green);

    // Jump forward the length of the plist
    read_pos += msg_length;

    // Calculate how much buffer is left
    var left_over = recieved.length - read_pos;

    // Is there some left over?
    if( left_over !== 0 ) {

      // Copy what's left over into a new buffer, and save it for next time
      var chunk = new Buffer(left_over);
      recieved.copy(chunk, 0, read_pos);
      recieved = chunk;

    } else {

      // Otherwise, empty the buffer and get out of the loop
      recieved = new Buffer(0);
      data_left_over = false;

    }

    // Reset the read position
    read_pos = 0;

    // Now do something with the plist
    if( plist ) {
      handle(plist);
    }

  }

});

socket.on('close', function() {
  logger.info('socket disconnected');
});

socket.connect(27753, '::1', function () {
  logger.info("socket connected:", socket.remoteAddress + ':' + socket.remotePort);

  send = raw_send.bind(this, socket);

  // Connect to Mobile Safari
  logger.info('sending connection key');
  send(msg.set_connection_key, function(simNameKey, simBuildKey) {
    logger.info([simNameKey, simBuildKey]);
  }, function(appDict) {
    logger.info(appDict);
    send(msg.connect_to_app, function(pageDict) {
      logger.info(pageDict);
      logger.info("indicating web view");
      send(msg.indicate_web_view_false, function() {
        logger.info('setting sender key');
        send(msg.set_sender_key, function() {
          //logger.info('enabling inspector');
          //send(msg.enable_inspector, function() {
            logger.info('sending alert');
            send(msg.send_alert, function(res) {
              console.log(res);
            });
          //});
        });
      });
    });
  });
});
