"use strict";

var _ = require("underscore")
  , server = require('./server.js')
  , rimraf = require('rimraf')
  , http = require('http')
  , path = require('path')
  , temp = require('temp')
  , difflib = require('difflib')
  , prompt = require('prompt')
  , exec = require('child_process').exec
  , spawn = require('child_process').spawn
  , parser = require('./app/parser')
  , markdown = require('markdown').markdown
  , maruku = "Maruku"
  , fs = require('fs');

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
    , withoutDelay: true
    , fastReset: true
    , noReset: false
    , launch: app ? true : false
    , log: path.resolve(__dirname, "appium.log")
    , address: '127.0.0.1'
    , androidDeviceReadyTimeout: 5
    , keepArtifacts: false }
    , readyCb
    , doneCb
  );
};

module.exports.runTestsWithServer = function(grunt, appName, testType, deviceType, verbose, cb) {
  if (typeof verbose === "undefined") {
      verbose = false;
  }
  var exitCode = null;
  var appServer = module.exports.startAppium(appName, verbose, function() {
    module.exports.runMochaTests(grunt, appName, testType, deviceType, function(code) {
      appServer.close();
      exitCode = code;
    });
  }, function() {
    console.log("Appium server exited");
    cb(exitCode === 0);
  });
};

module.exports.runMochaTests = function(grunt, appName, testType, deviceType, cb) {

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
  var mochaFiles = [];
  var fileConfig = grunt.config(['mochaTestWithServer']);
  var configAppDevice, nameOk, deviceOk, configAppTests;
  _.each(fileConfig, function(config, configAppName) {
    configAppDevice = config[0];
    configAppTests = config[1];
    nameOk = !appName || appName === configAppName;
    deviceOk = !deviceType || deviceType === configAppDevice;
    if (nameOk && deviceOk) {
      _.each(configAppTests, function(testFiles, testKey) {
        if (testType == "*" || testType == testKey) {
          _.each(testFiles, function(file) {
            _.each(grunt.file.expand(file), function(file) {
              mochaFiles.push(file);
            });
          });
        }
      });
    }
  });

  var exitCodes = [];
  var runMochaProc = function() {
    var file = mochaFiles.shift();
    if (typeof file !== "undefined") {
      var mochaProc = spawn('mocha', args.concat(file), {cwd: __dirname});
      mochaProc.stdout.setEncoding('utf8');
      mochaProc.stderr.setEncoding('utf8');
      mochaProc.stdout.on('data', function(data) {
        grunt.log.write(data);
      });
      mochaProc.stderr.on('data', function(data) {
        grunt.log.write(data);
      });
      mochaProc.on('exit', function(code) {
        exitCodes.push(code);
        runMochaProc();
      });
    } else {
      cb(_.max(exitCodes) || null);
    }
  };
  runMochaProc();
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
      console.log("Failed building app, maybe it doesn't exist?");
      cb(output);
    }
  });
};

module.exports.buildApp = function(appDir, cb, sdk) {
  if(typeof sdk === "undefined") {
    sdk = "iphonesimulator6.1";
  }
  var appRoot = path.resolve(__dirname, 'sample-code/apps/', appDir);
  module.exports.build(appRoot, function(err) {
    if (err !== null) {
      console.log(err);
      cb(false);
    } else {
      cb(true);
    }
  }, sdk);
};

module.exports.signApp = function(appName, certName, cb) {
  var appPath = path.resolve(__dirname, 'sample-code/apps/', appName,
      'build/Release-iphonesimulator');
  exec("codesign -f -s \"" + certName + "\" -v " + appName + ".app", {cwd: appPath}, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    if (err) {
      cb(false);
    } else {
      cb(true);
    }
  });
};

module.exports.downloadUICatalog = function(cb) {
  var appBasePath = path.resolve(__dirname, 'sample-code/apps');
  var appPath = path.resolve(appBasePath, 'UICatalog');
  var zipPath = path.resolve(appBasePath, 'UICatalog.zip');
  var UICatUrl = "http://developer.apple.com/library/ios/samplecode/UICatalog/UICatalog.zip";
  // clear out anything that's there
  try {
    fs.unlinkSync(zipPath);
  } catch(e) {}
  rimraf(appPath, function() {
    var file = fs.createWriteStream(zipPath);
    console.log("Downloading UI catalog into " + zipPath);
    http.get(UICatUrl, function(response) {
      response.pipe(file);
      response.on('end', function() {
        console.log("Download complete");
        exec("unzip UICatalog.zip", {cwd: appBasePath}, function() {
          console.log("Unzipped into " + appPath);
          cb();
        });
      });
    });
  });
};

var setupAndroidProj = function(grunt, projPath, args, cb) {
  if (!process.env.ANDROID_HOME) {
    grunt.fatal("Could not find Android SDK, make sure to export ANDROID_HOME");
  }
  var cmd = path.resolve(process.env.ANDROID_HOME, "tools", "android");
  var proc = spawn(cmd, args, {cwd: projPath});
  proc.stdout.setEncoding('utf8');
  proc.stderr.setEncoding('utf8');
  proc.stdout.on('data', function(data) {
    grunt.log.write(data);
  });
  proc.stderr.on('data', function(data) {
    grunt.log.write(data);
  });
  proc.on('exit', function(code) {
    cb(code);
  });
};

module.exports.setupAndroidBootstrap = function(grunt, cb) {
  var projPath = path.resolve(__dirname, "uiautomator", "bootstrap");
  var args = ["create", "uitest-project", "-n", "AppiumBootstrap", "-t",
              "android-17", "-p", "."];
  setupAndroidProj(grunt, projPath, args, cb);
};

module.exports.setupAndroidApp = function(grunt, appName, cb) {
  var appPath = path.resolve(__dirname, "sample-code/apps/" + appName);
  var args = ["update", "project", "--subprojects", "-t", "android-17", "-p", "."];
  setupAndroidProj(grunt, appPath, args, cb);
};

var buildAndroidProj = function(grunt, projPath, target, cb) {
  exec('which ant', function(err, stdout) {
    if (err) {
      grunt.fatal("Error finding ant binary, is it on your path?");
    } else {
      if (stdout) {
        var ant = stdout.trim();
        grunt.log.write("Using ant found at " + ant);
        var proc = spawn(ant, [target], {cwd: projPath});
        proc.stdout.setEncoding('utf8');
        proc.stderr.setEncoding('utf8');
        proc.stdout.on('data', function(data) {
          grunt.log.write(data);
        });
        proc.stderr.on('data', function(data) {
          grunt.log.write(data);
        });
        proc.on('exit', function(code) {
          cb(code);
        });
      } else {
        grunt.fatal("Could not find ant installed; please make sure it's on PATH");
      }
    }
  });
};

module.exports.buildAndroidBootstrap = function(grunt, cb) {
  var projPath = path.resolve(__dirname, "uiautomator", "bootstrap");
  buildAndroidProj(grunt, projPath, "build", cb);
};

module.exports.buildAndroidApp = function(grunt, appName, cb) {
  var appPath = path.resolve(__dirname, "sample-code/apps/" + appName);
  buildAndroidProj(grunt, appPath, "debug", cb);
};

module.exports.installAndroidApp = function(grunt, appName, cb) {
  var appPath = path.resolve(__dirname, "sample-code/apps/" + appName,
      "bin/" + appName + "-debug.apk");
  exec("adb install -r " + appPath, function(err, stdout) {
    if (err) {
      grunt.fatal(err);
    } else {
      grunt.log.write(stdout);
      cb();
    }
  });
};

module.exports.generateServerDocs = function(grunt, cb) {
  var p = parser();
  var docFile = path.resolve(__dirname, "docs/server-args.md");
  var md = "Appium server arguments\n==========\n\n";
  md += "Usage: `node server.js [flags]`\n\n";
  md += "### Server flags\n";
  md += "All flags are optional, but some are required in conjunction with " +
        "certain others.\n\n";
  md += "|Flag|Default|Description|Example|\n";
  md += "|----|-------|-----------|-------|\n";
  _.each(p.rawArgs, function(arg) {
    var argNames = arg[0];
    var exampleArg = typeof arg[0][1] === "undefined" ? arg[0][0] : arg[0][1];
    var argOpts = arg[1];
    md += "|`" + argNames.join("`, `") + "`";
    md += "|" + ((typeof argOpts.defaultValue === "undefined") ? "" : argOpts.defaultValue);
    md += "|" + argOpts.help;
    md += "|" + ((typeof argOpts.example === "undefined") ? "" : "`" + exampleArg + " " + argOpts.example + "`");
    md += "|\n";
  });
  fs.writeFile(docFile, md, function(err) {
    if (err) {
      console.log(err.stack);
      grunt.fatal(err);
    } else {
      grunt.log.write("New docs written! Don't forget to commit and push");
      cb();
    }
  });
};

module.exports.generateAppiumIo = function(grunt, cb) {
  getAppiumIoFiles(function(err, template, readme) {
    if (err) {
      return grunt.fatal(err);
    }
    var readmeMd = markdown.parse(readme)
      , headers = getMarkdownHeaders(readmeMd)
      , sidebarHtml = generateSidebarHtml(headers)
      , warning = "<!-- THIS FILE IS AUTOMATICALLY GENERATED DO NOT EDIT -->\n"
      , bodyHtml = generateBodyHtml(readmeMd, headers)
      , submod = path.resolve(__dirname, "submodules/appium.io")
      , outfile = submod + "/getting-started.html";

    var newDoc = template.replace("{{ SIDENAV }}", sidebarHtml)
                         .replace("{{ README_SECTIONS }}", bodyHtml)
                         .replace("{{ WARNING }}", warning);
    fs.writeFile(outfile, newDoc, function(err) {
      if (err) {
        grunt.fatal(err);
      } else {
        grunt.log.write("Pushing changes to appium.io...");
        var cmd = 'git commit -am "updating getting-started via grunt" && ' +
                  'git pull --rebase origin master && ' +
                  'git push origin master';
        exec(cmd, {cwd: submod}, function(err, stdout, stderr) {
          if (err) {
            console.log(stdout);
            console.log(stderr);
            grunt.fatal(err);
          } else {
            grunt.log.write("success!");
            cb();
          }
        });
      }
    });
  });
};

var getAppiumIoFiles = function(cb) {
  var templateFile = path.resolve(__dirname, "submodules/appium.io/getting-started-template.html")
    , readmeFile = path.resolve(__dirname, "README.md");

  fs.readFile(templateFile, function(err, templateData) {
    if (err) {
      cb(err);
    } else {
      fs.readFile(readmeFile, function(err, readmeData) {
        if (err) cb(err); else cb(null, templateData.toString(), readmeData.toString());
      });
    }
  });

};

var getMarkdownHeaders = function(mdTree) {
  var headers = {};
  _.each(mdTree, function(mdObj) {
    if (mdObjIsHeader(mdObj)) {
      headers[mdObj[2]] = sanitizeMdHeader(mdObj[2]);
    }
  });
  return headers;
};

var mdObjIsHeader = function(mdObj) {
  var isLevel2 = typeof mdObj[1] !== "undefined" && typeof mdObj[1].level !== "undefined" && mdObj[1].level === 2;
  return mdObj[0] === "header" && isLevel2;
};

var sanitizeMdHeader = function(header) {
  var re = new RegExp(/[^a-zA-Z0-9]/g);
  return header.replace(re, "-")
               .replace(/-$/, "")
               .replace(/-+/g, "-")
               .toLowerCase();
};

var generateSidebarHtml = function(headers) {
  var html = '';
  _.each(headers, function(link, header) {
    header = markdown.toHTML(header, maruku);
    header = header.replace(/<[^>]+>/ig, "");
    html += '<li><a href="#' + link + '"><i class="icon-chevron-right"></i> ' +
            header + '</a></li>\n';
  });
  return html;
};

var generateBodyHtml = function(readmeMd, headers) {
  var html = ''
    , inSection = false;
  _.each(readmeMd.slice(1), function(mdObj) {
    if (mdObjIsHeader(mdObj)) {
      var headerHtml = markdown.toHTML(mdObj[2], maruku);
      headerHtml = headerHtml.replace(/<.?p>/ig, '');
      if (inSection) {
        html += '</section>\n';
      }
      html += '<section id="' + headers[mdObj[2]] + '">\n';
      html += '<h2>\n<a href="#' + headers[mdObj[2]] + '" class="anchor" ' +
              'name="requirements">\n<span class="mini-icon mini-icon-link">' +
              '</span>\n</a>\n' +  headerHtml + '\n</h2>\n\n';
      inSection = true;
    } else if (inSection) {
      if (mdObj[0] === 'code_block') {
        html += '<pre class="prettyprint">' + mdObj[1] + '</pre>\n';
      } else {
        html += markdown.toHTML(mdObj, maruku);
      }
    }
  });
  html += '</section>';
  return html;
};
