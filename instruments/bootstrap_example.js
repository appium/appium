// automation globals
var target      = UIATarget.localTarget();
var application = target.frontMostApp();
var host = target.host();
var mainWindow  = application.mainWindow();
var elements = {}
var bufferFlusher = [];
// 16384 is apprently the buffer size used by instruments
for (i=0; i < 16384; i++) {
    bufferFlusher.push('*');
}
bufferFlusher = bufferFlusher.join('');

var console = {
  log: function(msg) {
    UIALogger.logMessage(msg);
  }
};

var endpoint = 'http://localhost:5678/instruments/';

function delay(secs)
{
    var date = new Date();
    var curDate = null;

    do { curDate = new Date(); }
    while(curDate-date < (secs * 1000.0));
}

var doCurl = function(method, url, data, cb) {
  args = ["-X", method];
  if (data) {
    for (var k in data) {
      if (data.hasOwnProperty(k)) {
        args = args.concat(['-d', k+"="+encodeURIComponent(data[k])]);
      }
    }
  }
  args.push(url);
  //console.log(url)
  res = host.performTaskWithPathArgumentsTimeout("/usr/bin/curl", args, 10);
  //console.log(res.status);
  //console.log(res.stdout);
  //console.log(res.stderr);
  cb(null, res.stdout);
};

doCurl('POST', endpoint + 'ready', null, function(err, res) {
  console.log(res);
});

var runLoop = true;
var gettingCommand = false;
target.setTimeout(1);

var getNextCommand = function(cb) {
  gettingCommand = true;
  doCurl('GET', endpoint + 'next_command', null, function(err, res) {
    console.log("Evaluating command type");
    if (res != "NONE") {
      sepIndex = res.indexOf('|');
      commandId = res.substr(0, sepIndex);
      command = res.substr(sepIndex + 1);
      cb(null, commandId, command);
    } else {
      cb("No command in queue");
    }
    gettingCommand = false;
  });
};


while(runLoop) {
  if (!gettingCommand) {
    getNextCommand(function(err, commandId, command) {
      if (err) {
        console.log("Error getting command: " + err);
      } else {
        console.log("Executing command " + commandId + ": " + command);
        var result = eval(command);
        console.log("####"+commandId+"####"+result+"####");
        var url = 'send_result/'+commandId+'/'+encodeURIComponent(result);
        doCurl('GET', endpoint + url, function(err, res) {
          console.log("Sent result to server");
        });
      }
    });
  } else {
    delay(1);
  }
}
