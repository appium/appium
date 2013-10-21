"use strict";

var _ = require('underscore')
  , net = require('net')
  , status = require("../../server/status.js")
  , logger = require('../../server/logger.js').get('appium');

var noop = function() {};

var UiAutomator = function(adb, opts) {
  this.adb = adb;
  this.proc = null;
  this.cmdCb = null;
  this.socketClient = null;
  this.restartBootstrap = false;
  this.onSocketReady = noop;
  this.alreadyExited = false;
  this.onExit = noop;
  this.webSocket = opts.webSocket;
  this.systemPort = opts.systemPort;
  this.resendLastCommand = function() {};
};

UiAutomator.prototype.start = function(readyCb, exitCb) {
  if (typeof exitCb !== "undefined") {
    this.onExit = exitCb;
  }

  logger.info("Running bootstrap");
  this.requireDeviceId();
  var args = ["shell", "uiautomator", "runtest", "AppiumBootstrap.jar", "-c",
      "io.appium.android.bootstrap.Bootstrap"];
  try {
    this.proc = this.adb.spawn(args);
  } catch (err) {
    return readyCb(new Error("Could not start adb, is it around?"));
  }

  this.onSocketReady = readyCb;

  this.proc.stdout.on('data', function(data) {
    this.outputStreamHandler(data);
  }.bind(this));

  this.proc.stderr.on('data', function(data) {
    this.errorStreamHandler(data);
  }.bind(this));

  this.proc.on('exit', function(code) {
    this.cmdCb = null;
    if (this.socketClient) {
      this.socketClient.end();
      this.socketClient.destroy();
      this.socketClient = null;
    }

    if (this.restartBootstrap === true) {
      // The bootstrap jar has crashed so it must be restarted.
      this.restartBootstrap = false;
      this.runBootstrap(function() {
        // Resend last command because the client is still waiting for the
        // response.
        this.resendLastCommand();
      }.bind(this), this.onExit);
      return;
    }

    if (!this.alreadyExited) {
      this.alreadyExited = true;
      this.onExit(code);
    }
  }.bind(this));
};

UiAutomator.prototype.checkForSocketReady = function(output) {
  if (/Appium Socket Server Ready/.test(output)) {
    this.socketClient = net.connect(this.systemPort, function() {
      this.debug("Connected!");
      this.onSocketReady(null);
    }.bind(this));
    this.socketClient.setEncoding('utf8');
    var oldData = '';
    this.socketClient.on('data', function(data) {
      this.debug("Received command result from bootstrap");
      try {
        data = JSON.parse(oldData + data);
        oldData = '';
      } catch (e) {
        logger.info("Stream still not complete, waiting");
        oldData += data;
        return;
      }
      if (this.cmdCb) {
        var next = this.cmdCb;
        this.cmdCb = null;
        next(data);
      } else {
        this.debug("Got data when we weren't expecting it, ignoring:");
        this.debug(JSON.stringify(data));
      }
    }.bind(this));
  }
};

UiAutomator.prototype.sendAction = function(action, params, cb) {
  if (typeof params === "function") {
    cb = params;
    params = {};
  }
  var extra = {action: action, params: params};
  this.sendCommand('action', extra, cb);
};

UiAutomator.prototype.sendCommand = function(type, extra, cb) {
  if (this.cmdCb !== null) {
    logger.warn("Trying to run a command when one is already in progress. " +
                "Will spin a bit and try again");
    var start = Date.now();
    var timeoutMs = 10000;
    var intMs = 200;
    var waitForCmdCbNull = function() {
      if (this.cmdCb === null) {
        this.sendCommand(type, extra, cb);
      } else if ((Date.now() - start) < timeoutMs) {
        setTimeout(waitForCmdCbNull, intMs);
      } else {
        cb(new Error("Never became able to push strings since a command " +
                     "was in process"));
      }
    }.bind(this);
    waitForCmdCbNull();
  } else if (this.socketClient) {
    this.resendLastCommand = function() {
      this.sendCommand(type, extra, cb);
    }.bind(this);
    if (typeof extra === "undefined" || extra === null) {
      extra = {};
    }
    var cmd = {cmd: type};
    cmd = _.extend(cmd, extra);
    var cmdJson = JSON.stringify(cmd) + "\n";
    this.cmdCb = cb;
    var logCmd = cmdJson.trim();
    if (logCmd.length > 1000) {
      logCmd = logCmd.substr(0, 1000) + "...";
    }
    this.debug("Sending command to android: " + logCmd);
    this.socketClient.write(cmdJson);
  } else {
    cb({
      status: status.codes.UnknownError.code
      , value: "Tried to send command to non-existent Android socket, " +
               "maybe it's shutting down?"
    });
  }
};

UiAutomator.prototype.sendShutdownCommand = function(cb) {
  setTimeout(function() {
    if (!this.alreadyExited) {
      logger.warn("Android did not shut down fast enough, calling it gone");
      this.alreadyExited = true;
      this.onExit(1);
    }
  }.bind(this), 7000);
  this.sendCommand('shutdown', null, cb);
};

UiAutomator.prototype.outputStreamHandler = function(output) {
  this.checkForSocketReady(output);
  this.handleBootstrapOutput(output);
};

UiAutomator.prototype.handleBootstrapOutput = function(output) {
  // for now, assume all intentional logging takes place on one line
  // and that we don't get half-lines from the stream.
  // probably bad assumptions
  output = output.toString().trim();
  var lines = output.split("\n");
  var re = /^\[APPIUM-UIAUTO\] (.+)\[\/APPIUM-UIAUTO\]$/;
  var match;
  _.each(lines, function(line) {
    line = line.trim();
    if (line !== '') {
      match = re.exec(line);
      if (match) {
        logger.info("[BOOTSTRAP] " + match[1]);

        var alertRe = /Emitting system alert message/;
        if (alertRe.test(line)) {
          logger.info("Emitting alert message...");
          this.webSocket.sockets.emit('alert', {message: line});
        }
      } else {
        // The dump command will always disconnect UiAutomation.
        // Detect the crash then restart UiAutomation.
        if (line.indexOf("UiAutomationService not connected") !== -1) {
          this.restartBootstrap = true;
        }
        logger.info(("[UIAUTOMATOR STDOUT] " + line).grey);
      }
    }
  }, this);
};

UiAutomator.prototype.errorStreamHandler = function(output) {
  var lines = output.split("\n");
  _.each(lines, function(line) {
    logger.info(("[UIAUTOMATOR STDERR] " + line).yellow);
  });
};

UiAutomator.prototype.debug = function(msg) {
  if (this.debugMode) {
    logger.info("[UIAUTOMATOR] " + msg);
  }
};

module.exports = UiAutomator;
