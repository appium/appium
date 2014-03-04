"use strict";

var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , deviceCommon = require('../common.js')
  , rd = require('./remote-debugger.js')
  , wkrd = require('./webkit-remote-debugger.js');

var iOSHybrid = {};

iOSHybrid.closeAlertBeforeTest = function (cb) {
  this.proxy("au.alertIsPresent()", function (err, res) {
    if (!err && res !== null && typeof res.value !== "undefined" && res.value === true) {
      logger.info("Alert present before starting test, let's banish it");
      this.proxy("au.dismissAlert()", function () {
        logger.info("Alert banished!");
        cb(true);
      });
    } else {
      cb(false);
    }
  }.bind(this));
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
    cb(res);
  }.bind(this);

  this.processingRemoteCmd = true;
  if (this.remote !== null && this.args.bundleId !== null) {
    if (this.args.udid !== null) {
      this.remote.pageArrayFromJson(function (pageArray) {
        cb(pageArray);
      });
    } else {
      this.remote.selectApp(this.args.bundleId, onDone);
    }
  } else {
    if (this.args.udid !== null) {
      this.remote = wkrd.init(!this.args.logNoColors, exitCb);
      this.remote.pageArrayFromJson(function (pageArray) {
        cb(pageArray);
      });
    } else {
      this.remote = rd.init(!this.args.logNoColors, exitCb);
      this.remote.connect(function (appDict) {
        if (!_.has(appDict, this.args.bundleId)) {
          logger.error("Remote debugger did not list " + this.args.bundleId + " among " +
                       "its available apps");
          if (_.has(appDict, "com.apple.mobilesafari")) {
            logger.info("Using mobile safari instead");
            this.remote.selectApp("com.apple.mobilesafari", onDone);
          } else {
            onDone([]);
          }
        } else {
          this.remote.selectApp(this.args.bundleId, onDone);
        }
      }.bind(this), this.onPageChange.bind(this));
      var loopCloseRuns = 0;
      var loopClose = function () {
        loopCloseRuns++;
        if (!isDone && loopCloseRuns < 3) {
          this.closeAlertBeforeTest(function (didDismiss) {
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
  logger.info("Remote debugger notified us of a new page listing");
  if (this.selectingNewPage) {
    logger.info("We're in the middle of selecting a page, ignoring");
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
  var cachedHandles = _.pluck(this.windowHandleCache, 'id');
  _.each(newIds, function (id) {
    if (!_.contains(cachedHandles, id)) {
      newPages.push(id);
    }
  });
  var newPage = null;
  if (this.curWindowHandle === null) {
    logger.info("We don't appear to have window set yet, ignoring");
  } else if (newPages.length) {
    logger.info("We have new pages, going to select page " + newPages[0]);
    newPage = newPages[0];
  } else if (!_.contains(newIds, this.curWindowHandle.toString())) {
    logger.info("New page listing from remote debugger doesn't contain " +
                 "current window, let's assume it's closed");
    if (keyId !== null) {
      logger.info("Debugger already selected page " + keyId + ", " +
                  "confirming that choice.");
    } else {
      logger.error("Don't have our current window anymore, and there " +
                   "aren't any more to load! Doing nothing...");
    }
    this.curWindowHandle = keyId;
    this.remote.pageIdKey = parseInt(keyId, 10);
  } else {
    var dirty = function () {
      var item = function (arr) {
        return _.filter(arr, function (obj) {
          return obj.id === this.curWindowHandle;
        }, this)[0];
      }.bind(this);

      return !_.isEqual(item(this.windowHandleCache), item(pageArray));
    }.bind(this);

    // If a window gets navigated to an anchor it doesn't always fire a page callback event
    // Let's check if we wound up in such a situation.
    if (dirty()) {
      this.remote.pageLoad();
    }

    logger.info("New page listing is same as old, doing nothing");
  }

  if (newPage !== null) {
    this.selectingNewPage = true;
    this.remote.selectPage(parseInt(newPage, 10), function () {
      this.selectingNewPage = false;
      this.curWindowHandle = newPage;
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
      this.curWindowHandle = null;
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
