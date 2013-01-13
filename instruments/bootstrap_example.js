// automation globals
var target      = UIATarget.localTarget();
var application = target.frontMostApp();
var host = target.host();
var mainWindow  = application.mainWindow();
var elements = {};
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

var endpoint = 'http://localhost:4723/instruments/';

function delay(secs)
{
    var date = new Date();
    var curDate = null;

    do { curDate = new Date(); }
    while(curDate-date < (secs * 1000.0));
}

var doCurl = function(method, url, data) {
  args = ["-i", "-X", method];
  if (data) {
    args = args.concat(['-d', JSON.stringify(data)]);
    args = args.concat(["-H", "Content-Type: application/json"]);
  }
  args.push(url);
  //console.log(url)
  //console.log(args);
  var res = host.performTaskWithPathArgumentsTimeout("/usr/bin/curl", args, 10);
  var response = res.stdout;
  //console.log(res.stdout);
  var splits = response.split("\r\n\r\n");
  var status = 500, value = null;
  if (!splits.length) {
    console.log("Could not find status code!");
  } else {
    var header = splits[0].split("\n")[0];
    value = splits.slice(1).join("");
    var match = /\d\d\d/.exec(header);
    if (!match) {
      console.log("Could not find status code in " + header + "!");
    } else {
      status = parseInt(match[0], 10);
    }
  }
  return {status: status, value: value}
};

doCurl('POST', endpoint + 'ready');

var runLoop = true;
target.setTimeout(1);

var getNextCommand = function() {
  var res = doCurl('GET', endpoint + 'next_command');
  if (res.status === 200) {
    var val = res.value;
    console.log("Result of get command is " + val);
    sepIndex = val.indexOf('|');
    commandId = val.substr(0, sepIndex);
    command = val.substr(sepIndex + 1);
    return {commandId: commandId, command: command};
  } else {
    console.log("There is no command to parse, or an error occurred");
    return null;
  }
};

var sendCommandResult = function(commandId, result) {
  var url = 'send_result/'+commandId;
  var res = doCurl('POST', endpoint + url, {result: result});
  res = JSON.parse(res.value);
  if (res.error) {
    console.log("Error: " + res.error);
  }
};

while(runLoop) {
  var cmd = getNextCommand();
  if (cmd) {
    console.log("Executing command " + cmd.commandId + ": " + cmd.command);
    var result = eval(cmd.command);
    if (typeof result === "undefined") {
      result = false;
    }
    console.log(cmd.commandId+": "+result);
    sendCommandResult(cmd.commandId, result);
  }
  delay(1);
}
