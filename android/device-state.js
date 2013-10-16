"use strict";

var exec = require('child_process').exec
  , logger = require('../lib/server/logger.js').get('appium');

function log(msg) {
  logger.info("[ADB] " + msg);
}

module.exports = {
  isScreenLocked: function(adbCmd, cb) {
    var cmd = adbCmd + " shell dumpsys window";
    log("Checking if screen is unlocked via `dumpsys window`...");
    exec(cmd, {maxBuffer: 524288}, function(err, stdout) {
      if (err) {
        cb(err);
      } else {
        var screenLocked = /mShowingLockscreen=\w+/gi.exec(stdout);
        var samsungNoteUnlocked = /mScreenOnFully=\w+/gi.exec(stdout);
        var gbScreenLocked = /mCurrentFocus.+Keyguard/gi.exec(stdout);
        if (screenLocked && screenLocked[0]) {
          if (screenLocked[0].split('=')[1] == 'false') {
            cb(null, false);
          } else {
            cb(null, true);
          }
        } else if (samsungNoteUnlocked && samsungNoteUnlocked[0]) {
          if (samsungNoteUnlocked[0].split('=')[1] == 'true') {
            cb(null, false);
          } else {
            cb(null, true);
          }
        } else if (gbScreenLocked && gbScreenLocked[0]) {
          cb(null, true);
        } else {
          cb(null, false);
        }
      }
    });
  }
};
