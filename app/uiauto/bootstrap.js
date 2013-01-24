#import "lib/console.js"
#import "lib/instruments_client.js"
#import "lib/delay.js"
#import "lib/appiumutils.js"
#import "lib/status.js"

// automation globals
var target = UIATarget.localTarget();
var mainWindow = target.frontMostApp().mainWindow();
var wd_frame = mainWindow;
var endpoint = 'http://localhost:4723/instruments/';

// safe default
target.setTimeout(1);

// let server know we're alive and get first command
var cmd = getFirstCommand();

UIATarget.onAlert = function(){
  return true;
};

while(true) {
  if (cmd) {
    console.log("Got new command from instruments: " + cmd);
    var result = eval(cmd);
    if (typeof result === "undefined") {
      result = {value: false};
      console.log("Command executed without response");
    }
    if (typeof result.status === "undefined") {
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
