"use strict";

var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , deviceCommon = require('../common.js')
  , rd = require('./remote-debugger.js')
  , wkrd = require('./webkit-remote-debugger.js');

var iOSHybrid = {};

iOSHybrid.closeAlertBeforeTest = function (cb) {
  this.proxy("au.alertIsPresent()", function (err, res) {
    if (!err && res !== null && typeof res !== "undefined" && res.value === true) {
      logger.debug("Alert present before starting test, let's banish it");
      this.proxy("au.dismissAlert()", function () {
        logger.debug("Alert banished!");
        cb(null, true);
      });
    } else {
      cb(null, false);
    }
  }.bind(this));
};

iOSHybrid.getDebuggerAppKey = function (appDict, bundleId) {
  var appKey = null;
  if (this.getNumericVersion() >= 8) {
    _.each(appDict, function (data, key) {
      if (data.bundleId === bundleId) {
        appKey = key;
      }
    });
    // now we need to determine if we should pick a proxy for this instead
    if (appKey) {
      _.each(appDict, function (data, key) {
        if (data.isProxy && data.hostId === appKey) {
          logger.debug("Found separate bundleId " + data.bundleId + " " +
            "acting as proxy for " + bundleId + ". Going to use its " +
            "app ID key of " + key + " instead");
          appKey = key;
        }
      });
    }
  } else {
    if (_.has(appDict, bundleId)) {
      appKey = bundleId;
    }
  }
  if (appKey === null) {
    throw new Error("Couldn't get app key from app dict");
  }
  return appKey;
};

iOSHybrid.listWebFrames = function (cb, exitCb) {
  var isDone = false;
  if (!this.args.bundleId) {
    logger.error("Can't enter web frame without a bundle ID");
    return cb(new Error("Tried to enter web frame without a bundle ID"));
  }
  var onDone = function (res) {
    this.processingRemoteCmd = false;
    isDone = true;
    if (Array.isArray(res) && res.length === 0) {
      // we have no web frames, so disconnect from the remote debugger
      this.stopRemote();
    }
    cb(null, res);
  }.bind(this);

  this.processingRemoteCmd = true;
  if (this.remote !== null && this.args.bundleId !== null) {
    if (this.args.udid !== null) {
      this.remote.pageArrayFromJson(cb);
    } else {
      if (this.remoteAppKey === null) {
        return cb(new Error("remote debug app key must be set"));
      }
      this.remote.selectApp(this.remoteAppKey, onDone);
    }
  } else {
    if (this.args.udid !== null) {
      this.remote = wkrd.init(exitCb);
      this.remote.pageArrayFromJson(cb);
    } else {
      this.remote = rd.init(exitCb);
      this.remote.connect(function (appDict) {
        var appKey;
        try {
          appKey = this.getDebuggerAppKey(appDict, this.args.bundleId);
        } catch (e) {
          logger.warn("Remote debugger did not list " + this.args.bundleId +
                      " among its available apps");
          try {
            appKey = this.getDebuggerAppKey(appDict, "com.apple.mobilesafari");
            logger.debug("Using mobile safari instead");
          } catch (e) {
            return onDone([]);
          }
        }
        logger.debug("Using remote debugger app key: " + appKey);
        this.remoteAppKey = appKey;
        this.remote.selectApp(appKey, onDone);
      }.bind(this), this.onPageChange.bind(this));
      var loopCloseRuns = 0;
      var loopClose = function () {
        loopCloseRuns++;
        if (!isDone && loopCloseRuns < 3) {
          this.closeAlertBeforeTest(function (err, didDismiss) {
            if (!didDismiss) {
              setTimeout(loopClose, 1000);
            }
          });
        }
      }.bind(this);
      setTimeout(loopClose, 4000);
    }
  }
};

iOSHybrid.onPageChange = function (pageArray) {
  logger.debug("Remote debugger notified us of a new page listing");
  if (this.selectingNewPage) {
    logger.debug("We're in the middle of selecting a page, ignoring");
    return;
  }
  var newIds = []
    , keyId = null;
  _.each(pageArray, function (page) {
    newIds.push(page.id.toString());
    if (page.isKey) {
      keyId = page.id.toString();
    }
  });
  var newPages = [];
  _.each(newIds, function (id) {
    if (!_.contains(this.contexts, id)) {
      newPages.push(id);
      this.contexts.push(id);
    }
  }.bind(this));
  var newPage = null;
  if (this.curContext === null) {
    logger.debug("We don't appear to have window set yet, ignoring");
  } else if (newPages.length) {
    logger.debug("We have new pages, going to select page " + newPages[0]);
    newPage = newPages[0];
  } else if (!_.contains(newIds, this.curContext.toString())) {
    logger.debug("New page listing from remote debugger doesn't contain " +
                 "current window, let's assume it's closed");
    if (keyId !== null) {
      logger.debug("Debugger already selected page " + keyId + ", " +
                  "confirming that choice.");
    } else {
      logger.error("Don't have our current window anymore, and there " +
                   "aren't any more to load! Doing nothing...");
    }
    this.curContext = keyId;
    this.remote.pageIdKey = parseInt(keyId, 10);
  } else {
    var dirty = function () {
      var item = function (arr) {
        return _.filter(arr, function (obj) {
          return obj.id === this.curContext;
        }, this)[0];
      }.bind(this);

      return !_.isEqual(item(this.contexts), item(pageArray));
    }.bind(this);

    // If a window gets navigated to an anchor it doesn't always fire a page callback event
    // Let's check if we wound up in such a situation.
    if (dirty()) {
      this.remote.pageLoad();
    }

    logger.debug("New page listing is same as old, doing nothing");
  }

  if (newPage !== null) {
    this.selectingNewPage = true;
    this.remote.selectPage(parseInt(newPage, 10), function () {
      this.selectingNewPage = false;
      this.curContext = newPage;
      if (this.onPageChangeCb !== null) {
        this.onPageChangeCb();
        this.onPageChangeCb = null;
      }
    }.bind(this));
  } else if (this.onPageChangeCb !== null) {
    this.onPageChangeCb();
    this.onPageChangeCb = null;
  }
  this.windowHandleCache = _.map(pageArray, this.massagePage);
};

iOSHybrid.getAtomsElement = deviceCommon.getAtomsElement;

iOSHybrid.stopRemote = function (closeWindowBeforeDisconnecting) {
  if (typeof closeWindowBeforeDisconnecting === "undefined") {
    closeWindowBeforeDisconnecting = false;
  }
  if (!this.remote) {
    logger.error("We don't appear to be in a web frame");
    throw new Error("Tried to leave a web frame but weren't in one");
  } else {
    var disconnect = function () {
      if (this.args.udid) {
        this.remote.disconnect(function () {});
      } else {
        this.remote.disconnect();
      }
      this.curContext = null;
      this.remoteAppKey = null;
      this.curWebFrames = [];
      this.curWebCoords = null;
      this.remote = null;
    }.bind(this);

    if (closeWindowBeforeDisconnecting) {
      this.closeWindow(disconnect);
    } else {
      disconnect();
    }
  }
};

module.exports = iOSHybrid;
