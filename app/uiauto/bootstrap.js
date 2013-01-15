#import "lib/console.js"
#import "lib/instruments_client.js"
#import "lib/delay.js"
#import "lib/appiumutils.js"

// automation globals
var target = UIATarget.localTarget();
var mainWindow = target.frontMostApp().mainWindow();
var wd_frame = mainWindow;
var endpoint = 'http://localhost:4723/instruments/';

// safe default
target.setTimeout(1);

// let server know we're alive and get first command
var cmd = getFirstCommand();
var noErrors = true;

while(noErrors) {
  if (cmd) {
    console.log("Got new command from instruments: " + cmd);
    var result = eval(cmd);
    if (typeof result === "undefined") {
      result = false;
      console.log("Command executed without response");
    } else {
      console.log("Result of command is: " + result);
    }
    cmd = sendResultAndGetNext(result);
  } else {
    console.log("Error getting next command, shutting down :-(");
    noErrors = false;
  }
}

