var spawn = require('child_process').spawn;

module.exports = function(appRoot, cb, sdk) {
  if (typeof sdk == "undefined") {
    sdk = 'iphonesimulator6.0';
  }
  console.log("Building app...");
  var args = ['-sdk', sdk];
  var xcode = spawn('xcodebuild', args, {
    cwd: appRoot
  });
  var output = '';
  var collect = function(data) { output += data; };
  xcode.stdout.on('data', collect);
  xcode.stderr.on('data', collect);
  xcode.on('exit', function(code) {
    if (code === 0) {
      cb(null);
    } else {
      console.log("Failed building app");
      cb(output);
    }
  });
};
