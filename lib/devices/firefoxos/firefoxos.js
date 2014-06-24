"use strict";

var errors = require('../../server/errors.js')
  , _ = require('underscore')
  , Device = require('../device.js')
  , logger = require('../../server/logger.js').get('appium')
  , net = require('net')
  , deviceCommon = require('../common.js')
  , status = require("../../server/status.js")
  , getAtomSrc = require('./firefoxos-atoms.js').get
  , async = require('async')
  , NotYetImplementedError = errors.NotYetImplementedError;

var Firefox = function () {
  this.init();
};

_.extend(Firefox.prototype, Device.prototype);
Firefox.prototype._deviceInit = Device.prototype.init;
Firefox.prototype.init = function () {
  this._deviceInit();
  this.capabilities = {
    platform: 'LINUX'
  , browserName: 'FirefoxOS'
  , platformVersion: '18.0'
  , webStorageEnabled: false
  , takesScreenshot: true
  , javascriptEnabled: true
  , databaseEnabled: false
  };
  this.queue = [];
  this.progress = 0;
  this.onStop = function () {};
  this.implicitWaitMs = 0;
  this.commandTimeoutMs = 60 * 1000;
  this.origCommandTimeoutMs = this.commandTimeoutMs;
  this.commandTimeout = null;
  this.asyncWaitMs = 0;
  this.onConnect = null;
  this.hasConnected = false;
  this.fromActor = null;
  this.socket = null;
  this.receiveStream = null;
  this.expectedRcvBytes = null;
  this.lastCmd = null;
  this.initCommandMap();
};

Firefox.prototype._deviceConfigure = Device.prototype.configure;
Firefox.prototype.configure = function (args, caps, cb) {
  this._deviceConfigure(args, caps);
  this.args.systemPort = 2828;
  cb();
};

Firefox.prototype.start = function (cb, onDie) {
  this.socket = new net.Socket();
  this.socket.on('close', function () {
    onDie(0);
  });
  this.socket.on('data', this.receive.bind(this));

  this.socket.connect(this.args.systemPort, 'localhost', function () { });


  this.onConnect = function () {
    logger.debug("Firefox OS socket connected");
    var mainCb = cb;
    async.waterfall([
      function (cb) { this.getMarionetteId(cb); }.bind(this),
      function (cb) { this.createSession(cb); }.bind(this),
      function (cb) { this.launchAppByName(cb); }.bind(this),
      function (frameId, cb) { this.frame(frameId, cb); }.bind(this)
    ], function () { mainCb(null, this.sessionId); }.bind(this));
  };

};

Firefox.prototype.stop = function (cb) {
  logger.debug("Stopping firefoxOs connection");
  this.proxy({type: 'deleteSession'}, function (err) {
    if (err) return cb(err);
    this.socket.destroy();
    cb(0);
  }.bind(this));
};

Firefox.prototype.getMarionetteId = function (cb) {
  logger.debug("Getting marionette id");
  this.proxy({type: 'getMarionetteID'}, function (err, res) {
    if (err) return cb(err);
    this.fromActor = res.id;
    cb(null);
  }.bind(this));
};

Firefox.prototype.createSession = function (cb) {
  logger.debug("Creating firefox os session");
  this.proxy({type: 'newSession'}, function (err, res) {
    if (err) return cb(err);
    this.sessionId = res.value;
    cb(null);
  }.bind(this));
};

Firefox.prototype.launchAppByName = function (cb) {
  logger.debug("Launching our app by its name");
  var atomSrc = getAtomSrc('gaia_apps');
  var wrappedScript = atomSrc +
    ";GaiaApps.launchWithName('" + this.args.app + "');";
  var cmd = {
    type: 'executeAsyncScript'
  , args: []
  , newSandbox: true
  , specialPowers: false
  , value: wrappedScript
  };
  this.proxy(cmd, function (err, res) {
    if (err) return cb(err);
    cb(null, res.value.frame.ELEMENT);
  });
};

Firefox.prototype.receive = function (data) {
  var parts, bytes, jsonData;
  if (this.receiveStream) {
    this.receiveStream += data.toString();
    logger.debug(data.length + " b more data received, adding to stream (" + this.receiveStream.length + " b)");
    try {
      data = JSON.parse(this.receiveStream);
      this.receiveStream = null;
    } catch (e) {
      logger.debug("Stream still not complete, waiting");
      return;
    }
  } else {
    parts = data.toString().split(":");
    bytes = parseInt(parts[0], 10);
    logger.debug("Data received, looking for " + bytes + " bytes");
    jsonData = parts.slice(1).join(":");
    try {
      data = JSON.parse(jsonData);
    } catch (e) {
      logger.debug("Data did not parse, waiting for more");
      this.receiveStream = jsonData;
      return;
    }
  }
  logger.debug(JSON.stringify(data));
  if (!this.hasConnected) {
    this.hasConnected = true;
    this.fromActor = data.from;
    this.onConnect();
  } else if (this.cbForCurrentCmd) {
    var cb = this.cbForCurrentCmd;
    this.progress--;
    this.cbForCurrentCmd = null;
    if (typeof cb === 'function') {
      this.respond(data, cb);
    }
    this.executeNextCommand();
  }
};

Firefox.prototype.proxy = deviceCommon.proxy;

Firefox.prototype.push = function (elem) {
  this.queue.push(elem);
  this.executeNextCommand();
};


Firefox.prototype.respond = function (data, cb) {
  if (typeof data.error !== "undefined") {
    cb(new Error(data.error.message));
  } else if (typeof data.id !== "undefined") {
    cb(null, data);
  } else {
    cb(null, {
      status: status.codes.Success.code
    , value: data.value
    });
  }
};


Firefox.prototype.executeNextCommand = function () {
  if (this.queue.length <= 0 || this.progress > 0) {
    return;
  }

  var target = this.queue.shift()
  , command = target[0]
  , cb = target[1];

  this.cbForCurrentCmd = cb;

  this.progress++;
  command.to = this.fromActor;
  var cmdStr = JSON.stringify(command);
  cmdStr = cmdStr.length + ':' + cmdStr;

  logger.debug("Sending command to firefoxOs: " + cmdStr);
  this.socket.write(cmdStr);
};

Firefox.prototype.cmdMap = function () {
  var elFn = function (elId) { return {element: elId }; };
  return {
    implicitWait: ['setSearchTimeout']
  , getUrl: ['getUrl']
  , findElement: ['findElement', function (strategy, selector) {
      return {
        using: strategy,
        value: selector
      };
    }, function (err, res, cb) {
      if (err) return cb(err);
      res.value = {ELEMENT: res.value};
      cb(null, res);
    }]
  , click: ['clickElement', elFn]
  , setValue: ['sendKeysToElement', function (elId, val) {
      return {
        element: elId
      , value: val.split("")
      };
    }]
  , getText: ['getElementText', elFn]
  , getPageSource: ['getPageSource']
  , execute: ['executeScript', function (script, params) {
      return {
        value: script
      , args: params
      };
    }]
  , frame: ['switchToFrame', elFn]
  };
};

Firefox.prototype.notImplementedCmds = function () {
  return [
    'equalsWebElement'
    , 'findElements'
    , 'findElementFromElement'
    , 'findElementsFromElement'
    , 'complexTap'
    , 'flick'
    , 'touchLongClick'
    , 'touchDown'
    , 'touchUp'
    , 'touchMove'
    , 'swipe'
    , 'hideKeyboard'
    , 'clear'
    , 'getName'
    , 'getAttribute'
    , 'getCssProperty'
    , 'getLocation'
    , 'getSize'
    , 'getWindowSize'
    , 'getPageIndex'
    , 'pressKeyCode'
    , 'longPressKeyCode'
    , 'keyevent'
    , 'back'
    , 'forward'
    , 'refresh'
    , 'keys'
    , 'leaveWebView'
    , 'elementDisplayed'
    , 'elementEnabled'
    , 'elementSelected'
    , 'getAlertText'
    , 'setAlertText'
    , 'postAcceptAlert'
    , 'postDismissAlert'
    , 'asyncScriptTimeout'
    , 'setOrientation'
    , 'getOrientation'
    , 'moveTo'
    , 'clickCurrent'
    , 'fakeFlickElement'
    , 'executeAsync'
    , 'title'
    , 'submit'
    , 'url'
    , 'active'
    , 'getWindowHandle'
    , 'setWindow'
    , 'closeWindow'
    , 'getWindowHandles'
    , 'receiveAsyncResponse'
    , 'setValueImmediate'
    , 'getCookies'
    , 'setCookie'
    , 'deleteCookie'
    , 'deleteCookies'
    , 'getCurrentActivity'
    , 'getCurrentPackage'
  ];
};

Firefox.prototype.initCommandMap = function () {
  var nyiCmds = this.notImplementedCmds();
  // create controller functions dynamically for implemented commands
  _.each(this.cmdMap(), function (cmdInfo, controller) {
    if (_.contains(nyiCmds, controller)) {
      throw new Error("Controller " + controller + " is listed in both " +
                      "implemented and not-yet-implemented lists. Fix this " +
                      "before moving on!");
    }
    this[controller] = function () {
      var args = Array.prototype.slice.call(arguments, 0);
      var cb;
      var outerCb = args[args.length - 1];
      if (typeof cmdInfo[2] === 'function') {
        cb = function (err, res) {
          cmdInfo[2](err, res, outerCb);
        };
      } else {
        cb = outerCb;
      }
      args = args.slice(0, args.length - 1);
      var cmd = {
        type: cmdInfo[0]
      };
      if (typeof cmdInfo[1] === 'function') {
        cmd  = _.extend(cmd, cmdInfo[1].apply(this, args));
      } else if (typeof cmdInfo[1] === "undefined" && args.length > 0) {
        cmd = _.extend(cmd, {value: args[0]});
      }
      this.proxy(cmd, cb);
    }.bind(this);
  }.bind(this));
  // throw not yet implemented for any command in nyi list
  _.each(nyiCmds, function (controller) {
    this[controller] = function () {
      var args = Array.prototype.slice.call(arguments, 0);
      var cb = args[args.length - 1];
      cb(new NotYetImplementedError(), null);
    }.bind(this);
  }.bind(this));
};

module.exports = Firefox;
