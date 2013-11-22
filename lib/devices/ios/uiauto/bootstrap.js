#import "lib/console.js"
#import "lib/instruments_client_launcher.js"
#import "appium/base.js"

// automation globals
var target = UIATarget.localTarget();
var mainWindow = target.frontMostApp().mainWindow();
var wd_frame = target.frontMostApp();

// safe default
target.setTimeout(1);

// let server know we're alive and get first command
var cmd = getFirstCommand();
var bootstrapSettings = {};

UIATarget.onAlert = function(alert) {
  if (alert.name() && alert.name().indexOf("attempting to open a pop-up") !== -1) {
    alert.defaultButton().tap();
    return true;
  }
  return true;
};
var result;
var configStr;
var configParts;
var bootstrapConfigPrefix = "setBootstrapConfig: ";

while(true) {
  if (cmd) {
    console.log("Got new command " + curAppiumCmdId + " from instruments: " + cmd);
    try {

      if (cmd.indexOf(bootstrapConfigPrefix) === 0) {
        configStr = cmd.slice(bootstrapConfigPrefix.length);
        console.log("Got bootstrap config: " + configStr);
        configParts = configStr.split("=");
        bootstrapSettings[configParts[0]] = JSON.parse(configParts[1]);
        console.log("Set bootstrap config key '" + configParts[0] + "' to " +
                    configParts[1]);
      } else {
        result = eval(cmd);
      }
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
