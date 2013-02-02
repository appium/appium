"use strict";

var _ = require("underscore")
  , server = require('./server.js')
  , fs = require('fs')
  , path = require('path')
  , temp = require('temp')
  , difflib = require('difflib')
  , prompt = require('prompt')
  , exec = require('child_process').exec
  , spawn = require('child_process').spawn;

module.exports.startAppium = function(appName, verbose, readyCb, doneCb) {
  var app;
  if (appName) {
    app = (fs.existsSync(appName)) ? appName:
      path.resolve(__dirname,
        "./sample-code/apps/"+appName+"/build/Release-iphonesimulator/"+appName+".app");
  } else {
    app = null;
  }
  return server.run({
    app: app
    , udid: null
    , verbose: verbose
    , port: 4723
    , warp: false
    , launch: app ? true : false
    , log: path.resolve(__dirname, "appium.log")
    , address: '127.0.0.1'
    , remove: true }
    , readyCb
    , doneCb
  );
};

module.exports.runTestsWithServer = function(grunt, appName, testType, verbose, cb) {
  if (typeof verbose === "undefined") {
      verbose = false;
  }
  var exitCode = null;
  var appServer = module.exports.startAppium(appName, verbose, function() {
    module.exports.runMochaTests(grunt, appName, testType, function(code) {
      appServer.close();
      exitCode = code;
    });
  }, function() {
    console.log("Appium server exited");
    cb(exitCode === 0);
  });
};

module.exports.runMochaTests = function(grunt, appName, testType, cb) {

  // load the options if they are specified
  var options = grunt.config(['mochaTestConfig', testType, 'options']);
  if (typeof options !== 'object') {
    options = grunt.config(['mochaTestConfig', 'options']);
  }
  if (typeof options.timeout === "undefined") {
    options.timeout = 60000;
  }
  if (typeof options.reporter === "undefined") {
    options.reporter = "tap";
  }
  var args = ['-t', options.timeout, '-R', options.reporter, '--colors'];
  var fileConfig = grunt.config(['mochaTestWithServer']);
  _.each(fileConfig, function(config, configApp) {
    if (!appName || appName === configApp) {
      _.each(config, function(testFiles, testKey) {
        if (testType == "*" || testType == testKey) {
          _.each(testFiles, function(file) {
            _.each(grunt.file.expandFiles(file), function(file) {
              args.push(file);
            });
          });
        }
      });
    }
  });

  var mochaProc = spawn('mocha', args, {cwd: __dirname});
  mochaProc.stdout.setEncoding('utf8');
  mochaProc.stderr.setEncoding('utf8');
  mochaProc.stdout.on('data', function(data) {
    grunt.log.write(data);
  });
  mochaProc.stderr.on('data', function(data) {
    grunt.log.write(data);
  });
  mochaProc.on('exit', function(code) {
    cb(code);
  });

};

module.exports.tail = function(grunt, filename, cb) {
  var proc = spawn('tail', ['-f', filename]);
  proc.stdout.setEncoding('utf8');
  proc.stdout.on('data', function(data) {
    grunt.log.write(data);
  });
  proc.on('exit', function(code) {
    cb(code);
  });
};

module.exports.authorize = function(grunt, cb) {
  // somewhat messily ported from penguinho's authorize.py
  var authFile = '/etc/authorization';
  exec('DevToolsSecurity --enable', function(err, stdout, stderr) {
    if (err) throw err;
    fs.readFile(authFile, 'utf8', function(err, data) {
      if (err) throw err;
      var origData = data;
      var re = /<key>system.privilege.taskport<\/key>\s*\n\s*<dict>\n\s*<key>allow-root<\/key>\n\s*(<[^>]+>)/;
      var match = re.exec(data);
      if (!match) {
        grunt.fatal("Could not find the system.privilege.taskport key in /etc/authorization");
      } else {
        if (!(/<false\/>/.exec(match[0]))) {
          grunt.fatal("/etc/authorization has already been modified to support appium");
        } else {
          var newText = match[0].replace(match[1], '<true/>');
          var newContent = data.replace(match[0], newText);
          temp.open('authorization.backup.', function (err, info) {
            fs.write(info.fd, origData);
            fs.close(info.fd, function(err) {
              if (err) throw err;
              grunt.log.writeln("Backed up to " + info.path);
              var diff = difflib.contextDiff(origData.split("\n"), newContent.split("\n"), {fromfile: "before", tofile: "after"});
              grunt.log.writeln("Check this diff to make sure the change looks cool:");
              grunt.log.writeln(diff.join("\n"));
              prompt.start();
              var promptProps = {
                properties: {
                  proceed: {
                    pattern: /^(y|n)/
                    , description: "Make changes? [y/n] "
                  }
                }
              };
              prompt.get(promptProps, function(err, result) {
                if (result.proceed == "y") {
                  fs.writeFile(authFile, newContent, function(err) {
                    if (err) {
                      if (err.code === "EACCES") {
                        grunt.fatal("You need to run this as sudo!");
                      } else {
                        throw err;
                      }
                    }
                    grunt.log.writeln("Wrote new /etc/authorization");
                    cb();
                  });
                } else {
                  grunt.log.writeln("No changes were made");
                  cb();
                }
              });
            });
          });
        }
      }
    });
  });
};

module.exports.build = function(appRoot, cb, sdk) {
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
