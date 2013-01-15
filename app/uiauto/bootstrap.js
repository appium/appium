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

<<<<<<< HEAD
while(noErrors) {
=======
var getNextCommand = function() {
  var res = doCurl('GET', endpoint + 'next_command');
  if (res.status === 200) {
    var val = res.value;
    sepIndex = val.indexOf('|');
    commandId = val.substr(0, sepIndex);
    command = val.substr(sepIndex + 1);
    return {commandId: commandId, command: command};
  } else {
    console.log("There is no command to parse, or an error occurred");
    return null;
  }
};

UIATarget.onAlert = function(){
  return true;
};

var sendCommandResult = function(commandId, result) {
  var url = 'send_result/'+commandId;
  var res = doCurl('POST', endpoint + url, {result: result});
  res = JSON.parse(res.value);
  if (res.error) {
    console.log("Error sending result: " + res.error);
  } else {
    console.log("Sent result for command " + commandId);
  }
};

while(true) {
  var cmd = getNextCommand();
>>>>>>> updating sample project to contain alert triggering button,
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

