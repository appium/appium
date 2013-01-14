var bufLen = 16384; // 16384 is apprently the buffer size used by instruments

var console = {
  log: function(msg) {
    var msgLen = msg.length;
    var newMsg = msg + "\n";
    for (i = 0; i < bufLen - msg.length; i++) {
      newMsg += "*";
    }
    UIALogger.logMessage(newMsg);
  }
};
