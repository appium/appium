#import "lib/console.js"
#import "lib/instruments_client.js"
#import "appium/base.js"

// automation globals
var target = UIATarget.localTarget();
var mainWindow = target.frontMostApp().mainWindow();
var wd_frame = mainWindow;

// safe default
target.setTimeout(1);

// let server know we're alive and get first command
var cmd = getFirstCommand();

UIATarget.onAlert = function(){
  return true;
};

while(true) {
  if (cmd) {
    console.log("Got new command " + curAppiumCmdId + " from instruments: " + cmd);
    try {
      var result = eval(cmd);
    } catch(e) {
      result = {
        status: codes.JavaScriptError.code
        , value: e.message
      };
    }
    if (typeof result === "undefined" || result === null) {
      result = '';
      console.log("Command executed without response");
    }
    if (typeof result.status === "undefined" || typeof result.status === "object") {
      console.log("Result is not protocol compliant, wrapping");
      result = {
        status: codes.Success.code,
        value: result
      };
    }
    cmd = sendResultAndGetNext(result);
  } else {
    throw new Error("Error getting next command, shutting down :-(");
  }
}
