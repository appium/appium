var system = UIATarget.localTarget().host();

var doCurl = function(method, url, data) {
  args = ["-i", "-X", method];
  if (data) {
    args = args.concat(['-d', JSON.stringify(data)]);
    args = args.concat(["-H", "Content-Type: application/json"]);
  }
  args.push(url);
  //console.log(url)
  //console.log(args);
  var res = system.performTaskWithPathArgumentsTimeout("/usr/bin/curl", args, 10);
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
