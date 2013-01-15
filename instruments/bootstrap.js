#import "../app/uiauto/lib/console.js"

// automation globals
var target = UIATarget.localTarget();
var mainWindow = target.frontMostApp().mainWindow();
var wd_frame = mainWindow;
var sock = 'http://localhost:4723/instruments/';
var system = UIATarget.localTarget().host();

// safe default
target.setTimeout(1);

var sendResultAndGetNext = function(result) {
  args = ['client.js', '-s', '/tmp/instruments_sock'];
  if (typeof result !== "undefined") {
    args = args.concat(['-r', JSON.stringify(result)]);
  }
  var res = system.performTaskWithPathArgumentsTimeout('/usr/local/bin/node', args, 20);
  console.log("Next command from instruments is: " + res.stdout);
  return res.stdout;
};

var cmd = sendResultAndGetNext();

while(true) {
  var result = eval(cmd);
  if (typeof result === "undefined") {
    result = false;
    console.log("Command executed without response");
  } else {
    console.log("Result of command is: " + result);
  }
  cmd = sendResultAndGetNext(result);
}

