"use strict";

var logger = require('./logger').get('appium')
  , inTimeWarp = false
  , timeWarpDoneCb = function() {}
  , warpFactor = 1
  , exec = require('child_process').exec;

var pad0 = function(x) {
  if (x.toString().length == 1) {
    x = '0' + x;
  }
  return x;
};

var getDateStr = function(dateObj) {
  return [pad0(dateObj.getHours()),
          pad0(dateObj.getMinutes()),
          '.',
          pad0(dateObj.getSeconds())].join('');
};

exports.checkWarpDrive = function(cb) {
  var dateStr = getDateStr(new Date());
  exec('echo "\n" | sudo -S /bin/date ' + dateStr, function(err) {
    if (err) {
      logger.error("You can't access the warp drive; make sure you're the " +
                   "Captain or Scotty");
      cb(false);
    } else {
      cb(true);
    }
  });
};

exports.timeWarp = function(period, warp, resetTime) {
  resetTime = resetTime === "undefined" ? false : resetTime;
  var warpStartTime = Date.now();
  if (!inTimeWarp) {
    var numHops = 0;
    logger.info("Starting time warp");
    period = typeof period === "undefined" ? 50 : period;
    warp = typeof warp === "undefined" ? 1000 : warp;
    warpFactor = (warp + period) / period;
    var makeJump = function() {
      var curMs, newDate, dateStr, realTime, fakeTime, info;
      if (inTimeWarp) {
        curMs = Date.now();
        newDate = new Date(curMs + warp);
        dateStr = getDateStr(newDate);
        exec('sudo -S /bin/date ' + dateStr, function(err, stdout, stderr) {
          if (err) {
            logger.error("Could not set date, here's stderr:");
            logger.error(stderr);
            throw new Error("time warp failed, not enough power to make jump");
          } else {
            numHops++;
            setTimeout(makeJump, period);
          }
        });
      } else {
        warpFactor = 1;
        realTime = period * numHops / 1000;
        fakeTime = (warp * numHops / 1000) + realTime;
        info = "Moved forward " + fakeTime + " secs in " + realTime + " actual seconds. That's a warp factor of " + (fakeTime / realTime).toFixed(1) + "!";
        logger.info("Stopping time warp: " + info);
        if (resetTime) {
          newDate = new Date(warpStartTime + ((period + 8) * numHops));
          var newDateStr = getDateStr(newDate);
          exec('sudo /bin/date ' + newDateStr, function() {
            logger.info("Attempted to reset system time to something " +
                        "reasonable. Hope you enjoyed your trip to the future");
            timeWarpDoneCb(period * numHops);
          });
        } else {
          timeWarpDoneCb(period * numHops);
        }
      }
    };
    inTimeWarp = true;
    makeJump();
  } else {
    logger.info("You asked for a time warp but we're already in the middle " +
                "of a series of jumps...");
  }
};

exports.stopTimeWarp = function(cb) {
  inTimeWarp = false;
  if (typeof cb === "function") {
    timeWarpDoneCb = cb;
  }
};

exports.setWarpAwareTimeout = function(fn, ms) {
  ms *= warpFactor;
  setTimeout(fn, ms);
};
