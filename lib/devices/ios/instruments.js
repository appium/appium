// Wrapper around Apple's Instruments app
"use strict";

var spawn = require('child_process').spawn
  , through = require('through')
  , exec = require('child_process').exec
  , logger = require('../../server/logger.js').get('appium')
  , fs = require('fs')
  , _ = require('underscore')
  , net = require('net')
  , uuid = require('uuid-js')
  , path = require('path')
  , rimraf = require('rimraf')
  , mkdirp = require('mkdirp')
  , codes = require('../../server/status.js').codes;

var ERR_NEVER_CHECKED_IN = "Instruments never checked in"
  , ERR_CRASHED_ON_STARTUP = "Instruments crashed on startup";

var Instruments = function (opts) {
  this.app = opts.app;
  this.launchTimeout = opts.launchTimeout || 90000;
  this.termTimeout = 3000;
  this.killTimeout = 3000;
  this.termTimer = null;
  this.killTimer = null;
  this.flakeyRetries = opts.flakeyRetries;
  this.launchTries = 0;
  this.neverConnected = false;
  this.udid = opts.udid;
  this.isSafariLauncherApp = opts.isSafariLauncherApp;
  this.bootstrap = opts.bootstrap;
  this.sock = opts.sock || '/tmp/instruments_sock';
  this.template = opts.template;
  this.withoutDelay = opts.withoutDelay;
  this.xcodeVersion = opts.xcodeVersion;
  this.webSocket = opts.webSocket;
  this.commandQueue = [];
  this.curCommand = null;
  this.resultHandler = this.defaultResultHandler;
  this.launchHandlerCalledBack = false;
  this.exitHandler = this.defaultExitHandler;
  this.socketConnectTimeout = null;
  this.hasConnected = false;
  this.traceDir = null;
  this.proc = null;
  this.shutdownCb = null;
  this.didLaunch = false;
  this.debugMode = false;
  this.onReceiveCommand = null;
  this.guid = uuid.create();
  this.bufferedData = "";
  this.instrumentsPath = "";
  this.eventRouter = {'cmd': this.commandHandler};
  this.socketServer = null;
  this.logNoColors = opts.logNoColors;
};


/* INITIALIZATION */

Instruments.prototype.start = function (launchCb, unexpectedExitCb) {
  if (this.didLaunch) {
    return launchCb(new Error("Called start() but we already launched"));
  }
  this.launchHandlerCb = launchCb;
  this.exitHandler = unexpectedExitCb;

  exec('xcrun -find instruments', function (err, stdout) {
    if (typeof stdout === "undefined") stdout = "";
    this.instrumentsPath = stdout.trim();
    if (err || !this.instrumentsPath) {
      logger.error("Could not find instruments binary");
      if (err) logger.error(err.message);
      return this.launchHandler(new Error("Could not find the instruments " +
          "binary. Please ensure `xcrun -find instruments` can locate it."));
    }
    logger.info("Instruments is at: " + this.instrumentsPath);

    this.initSocketServer(function (err) {
      if (err) return this.launchHandler(err);
      this.launch(function (err) {
        if (err) return this.launchHandler(err);
        // we don't call launchHandler in the success case; it's called
        // when instruments checks in, in the conn handler for the socket
        // server, or when instruments times out, in onSocketNeverConnect
      }.bind(this));
    }.bind(this));
  }.bind(this));
};

Instruments.prototype.launchHandler = function (err) {
  if (!this.launchHandlerCalledBack) {
    clearTimeout(this.socketConnectTimeout);
    if (!err) {
      this.didLaunch = true;
      this.neverConnected = false;
    } else {
      if (this.launchTries < this.flakeyRetries &&
          (err.message === ERR_NEVER_CHECKED_IN ||
           err.message === ERR_CRASHED_ON_STARTUP)) {
        this.launchTries++;
        logger.info("Attempting to retry launching instruments, this is " +
                    "retry #" + this.launchTries);
        this.killProc();
        return this.launch(function (err) {
          if (err) return this.launchHandler(err);
        }.bind(this));
      }
      logger.error(err.message);
    }
    this.launchHandlerCalledBack = true;
    if (err) this.killProc();
    this.launchHandlerCb(err);
  } else {
    logger.info("Trying to call back from instruments launch but we " +
                "already did");
  }
};

Instruments.prototype.termProc = function () {
  if (this.proc !== null) {
    logger.info("Sending sigterm to instruments");
    this.termTimer = setTimeout(function () {
      logger.info("Instruments didn't terminate after " + (this.termTimeout / 1000) +
                  " seconds; trying to kill it");
      this.killProc();
    }.bind(this), this.termTimeout);
    this.proc.kill('SIGTERM');
  }
};

Instruments.prototype.killProc = function () {
  logger.info("Killall instruments");
  var cmd = 'killall -9 "instruments"';
  exec(cmd, { maxBuffer: 524288 }, function (err) {
    if (err && err.message.indexOf('matching processes') === -1) {
      logger.warn("Problem killing instruments: " + err.message);
    }
  }.bind(this));
};

Instruments.prototype.onSocketNeverConnect = function () {
  logger.error("Instruments socket client never checked in; timing out".red);
  this.neverConnected = true;
  this.killProc();
};

Instruments.prototype.initSocketServer = function (cb) {
  this.socketServer = net.createServer({allowHalfOpen: true},
      this.onSocketConnect.bind(this));

  this.socketServer.on('close', function () {
    this.debug("Instruments socket server was closed");
  }.bind(this));

  // remove socket file if it currently exists
  try {
    fs.unlinkSync(this.sock);
  } catch (err) {
    // if we get any error other than "socket doesn't exist", fail
    if (err.message.indexOf("ENOENT") === -1) {
      return cb(err);
    }
  }

  this.socketServer.listen(this.sock, function (err) {
    if (err) return cb(err);
    this.debug("Instruments socket server started at " + this.sock);
    cb();
  }.bind(this));

};

Instruments.prototype.onSocketConnect = function (conn) {
  if (!this.hasConnected) {
    this.hasConnected = true;
    this.debug("Instruments is ready to receive commands");
    this.launchHandler();
  }
  conn.setEncoding('utf8'); // get strings from sockets rather than buffers

  conn.pipe(through(function (data) {
    // when data comes in, route it according to the "event" property
    this.debug("Socket data received (" + data.length + " bytes)");
    this.bufferedData += data;
  }.bind(this)));

  this.currentSocket = conn;

  conn.on('close', function () {
    this.currentSocket = null;
  }.bind(this));

  conn.on('end', function () {
    var data = this.bufferedData;
    this.bufferedData = "";
    try {
      data = JSON.parse(data);
    } catch (e) {
      logger.error("Couldn't parse JSON data from socket, maybe buffer issue?");
      logger.error(data);
      data = {
        event: 'cmd'
      , result: {
          status: codes.UnknownError
        , value: "Error parsing socket data from instruments"
        }
      };
    }
    if (!_.has(data, 'event')) {
      logger.error("Socket data came in without event, it was:");
      logger.error(JSON.stringify(data));
    } else if (!_.has(this.eventRouter, data.event)) {
      logger.error("Socket is asking for event '" + data.event +
                  "' which doesn't exist");
    } else {
      this.debug("Socket data being routed for '" + data.event + "' event");
      this.eventRouter[data.event].bind(this)(data, conn);
    }
  }.bind(this));
};

Instruments.prototype.launch = function (cb) {
  // prepare temp dir
  var tmpDir = "/tmp/appium-instruments/";
  try {
    rimraf.sync(tmpDir);
    mkdirp.sync(tmpDir);
  } catch (err) {
    return cb(err);
  }

  try {
    this.proc = this.spawnInstruments(tmpDir);
  } catch (err) {
    return cb(err);
  }
  // start waiting for instruments to launch successfully
  this.socketConnectTimeout = setTimeout(
        this.onSocketNeverConnect.bind(this),
        this.launchTimeout);

  this.proc.stdout.setEncoding('utf8');
  this.proc.stderr.setEncoding('utf8');
  this.proc.stdout.pipe(through(this.outputStreamHandler.bind(this)));
  this.proc.stderr.pipe(through(this.errorStreamHandler.bind(this)));
  this.proc.on('exit', this.onInstrumentsExit.bind(this));
};

Instruments.prototype.spawnInstruments = function (tmpDir) {
  var args = ["-t", this.template];
  if (this.udid) {
    args = args.concat(["-w", this.udid]);
    logger.info("Attempting to run app on real device with UDID " + this.udid);
  }
  args = args.concat([this.app]);
  args = args.concat(["-e", "UIASCRIPT", this.bootstrap]);
  args = args.concat(["-e", "UIARESULTSPATH", tmpDir]);
  var env = _.clone(process.env);
  var buildPath = path.resolve(__dirname, "../../../build");
  var isXcode4 = this.xcodeVersion !== null && this.xcodeVersion[0] === '4';
  var iwdPath = path.resolve(buildPath, isXcode4 ? "iwd4" : "iwd");
  env.CA_DEBUG_TRANSACTIONS = 1;
  if (this.withoutDelay && !this.udid) {
    env.DYLD_INSERT_LIBRARIES = path.resolve(iwdPath, "InstrumentsShim.dylib");
    env.LIB_PATH = iwdPath;
  }
  logger.info("Spawning instruments with command: " + this.instrumentsPath +
              " " + args.join(" "));
  logger.info("And extra without-delay env: " + JSON.stringify({
    DYLD_INSERT_LIBRARIES: env.DYLD_INSERT_LIBRARIES
  , LIB_PATH: env.LIB_PATH
  }));
  logger.info("And launch timeout: " + this.launchTimeout + "ms");
  return spawn(this.instrumentsPath, args, {env: env});
};

Instruments.prototype.onInstrumentsExit = function (code) {
  if (this.termTimer) {
    clearTimeout(this.termTimer);
  }
  if (this.killTimer) {
    clearTimeout(this.killTimer);
  }

  this.debug("Instruments exited with code " + code);

  if (this.neverConnected) {
    this.neverConnected = false; // reset so we can catch this again
    return this.launchHandler(new Error(ERR_NEVER_CHECKED_IN));
  }

  if (!this.didLaunch) {
    return this.launchHandler(new Error(ERR_CRASHED_ON_STARTUP));
  }

  this.cleanupInstruments();

  if (this.isSafariLauncherApp) {
    logger.info("Not worrying about instruments exit since we're using " +
                "SafariLauncher");
    this.launchHandler();
  } else if (this.shutdownCb !== null) {
    this.shutdownCb();
    this.shutdownCb = null;
  } else {
    this.exitHandler(code, this.traceDir);
  }

};

Instruments.prototype.cleanupInstruments = function () {
  logger.info("Cleaning up after instruments exit");
  this.proc = null;
  // make sure clear out command cbs so we can't have any lingering cbs
  // if a socket request makes it through after exit somehow
  this.curCommand = null;
  this.onReceiveCommand = null;

  if (this.currentSocket) {
    this.debug("Closing instruments client socket due to exit");
    this.currentSocket.end();
    this.currentSocket.destroy(); // close this
    this.socketServer.close();
  }

};


/* COMMAND LIFECYCLE */

Instruments.prototype.commandHandler = function (data, c) {
  var hasResult = typeof data.result !== "undefined";
  if (hasResult && !this.curCommand) {
    logger.info("Got a result when we weren't expecting one! Ignoring it");
    logger.info("Result was: " + JSON.stringify(data.result));
  } else if (!hasResult && this.curCommand) {
    logger.info("Instruments didn't send a result even though we were expecting one");
    hasResult = true;
    data.result = false;
  }

  if (hasResult && this.curCommand) {
    if (data.result) {
      this.debug("Got result from instruments: " + JSON.stringify(data.result));
    } else {
      this.debug("Got null result from instruments");
    }
    this.curCommand.cb(data.result);
    this.curCommand = null;
  }

  this.waitForCommand(function () {
    this.curCommand = this.commandQueue.shift();
    this.onReceiveCommand = null;
    this.debug("Sending command to instruments: " + this.curCommand.cmd);
    c.write(JSON.stringify({nextCommand: this.curCommand.cmd}));
    c.end();
    //this.debug("Closing our half of the connection");
  }.bind(this));
};

Instruments.prototype.waitForCommand = function (cb) {
  if (this.commandQueue.length) {
    cb();
  } else {
    this.onReceiveCommand = cb;
  }
};

Instruments.prototype.sendCommand = function (cmd, cb) {
  this.commandQueue.push({cmd: cmd, cb: cb});
  if (this.onReceiveCommand) {
    this.onReceiveCommand();
  }
};


/* PROCESS MANAGEMENT */

Instruments.prototype.shutdown = function (cb) {
  this.termProc();
  this.shutdownCb = cb;
};

Instruments.prototype.doExit = function () {
  console.log("Calling exit handler");
};


/* INSTRUMENTS STREAM MANIPULATION*/

Instruments.prototype.clearBufferChars = function (output) {
  // Instruments output is buffered, so for each log output we also output
  // a stream of very many ****. This function strips those out so all we
  // get is the log output we care about
  var re = /(\n|^)\*+\n?/g;
  output = output.toString();
  output = output.replace(re, "");
  return output;
};

Instruments.prototype.outputStreamHandler = function (output) {
  output = this.clearBufferChars(output);
  this.lookForShutdownInfo(output);
  this.resultHandler(output);
};

Instruments.prototype.errorStreamHandler = function (output) {
  var logMsg = ("[INST STDERR] " + output);
  if (!this.logNoColors) {
    logMsg = logMsg.yellow;
  }
  logger.info(logMsg);
  if (this.webSocket) {
    var re = /Call to onAlert returned 'YES'/;
    var match = re.test(output);
    if (match) {
      logger.info("Emiting alert message...");
      this.webSocket.sockets.emit('alert', {message: output});
    }
  }
};

Instruments.prototype.lookForShutdownInfo = function (output) {
  var re = /Instruments Trace Complete.+Output : ([^\)]+)\)/;
  var match = re.exec(output);
  if (match) {
    this.traceDir = match[1];
  }
};


/* DEFAULT HANDLERS */

Instruments.prototype.setResultHandler = function (handler) {
  this.resultHandler = handler;
};

Instruments.prototype.defaultResultHandler = function (output) {
  // if we have multiple log lines, indent non-first ones
  if (output !== "") {
    output = output.replace(/\n/m, "\n       ");
    output = "[INST] " + output;
    if (!this.logNoColors) {
      output = output.green;
    }
    logger.info(output);
  }
};

Instruments.prototype.defaultExitHandler = function (code, traceDir) {
  logger.info("Instruments exited with code " + code + " and trace dir " + traceDir);
};


/* MISC */

Instruments.prototype.setDebug = function (debug) {
  if (typeof debug === "undefined") {
    debug = true;
  }
  this.debugMode = debug;
};

Instruments.prototype.debug = function (msg) {
  var log = "[INSTSERVER] " + msg;
  if (!this.logNoColors) {
    log = log.grey;
  }

  logger.info(log);
};


module.exports = Instruments;
