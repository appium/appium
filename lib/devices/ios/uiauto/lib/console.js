/* jshint -W079 */
var bufLen = 16384; // 16384 is apprently the buffer size used by instruments

/* exported console */
var console = {
  log: function (msg) {
    if (typeof msg === "undefined") {
      msg = "(undefined)";
    } else if (msg === null) {
      msg = "(null)";
    }
    var newMsg = msg + "\n";
    for (var i = 0; i < bufLen - msg.length - 1; i++) {
      newMsg += "*";
    }

    if (typeof isVerbose !== "undefined" && isVerbose) UIALogger.logMessage(newMsg);
  }
};
