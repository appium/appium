"use strict";

var _ = require("underscore")
  , server = require('./lib/server/main.js')
  , rimraf = require('rimraf')
  , path = require('path')
  , temp = require('temp')
  , mkdirp = require('mkdirp')
  , ncp = require('ncp')
  , difflib = require('difflib')
  , prompt = require('prompt')
  , exec = require('child_process').exec
  , spawn = require('win-spawn')
  , parser = require('./lib/server/parser.js')
  , namp = require('namp')
  , parseXmlString = require('xml2js').parseString
  , appiumVer = require('./package.json').version
  , fs = require('fs')
  , helpers = require('./lib/helpers')
  , isWindows = helpers.isWindows()
  , getXcodeVersion = helpers.getXcodeVersion
  , MAX_BUFFER_SIZE = 524288;

module.exports.startAppium = function(appName, verbose, readyCb, doneCb) {
  var app;
  if (appName) {
    app = (fs.existsSync(appName)) ? appName:
      path.resolve(__dirname, "sample-code", "apps", appName, "build", "Release-iphonesimulator", appName + ".app");
  } else {
    app = null;
  }
  return server.run({
    app: app
    , udid: null
    , quiet: !verbose
    , port: 4723
    , nativeInstrumentsLib: false
    , fullReset: false
    , noReset: false
    , launch: app ? true : false
    , log: path.resolve(__dirname, "appium.log")
    , address: '127.0.0.1'
    , androidDeviceReadyTimeout: 5
    , nodeconfig: null
    , robotPort: -1
    , robotAddresss: '0.0.0.0'
    , keepArtifacts: false
    , ipa: null
    , avd: null }
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
      cb(_.max(exitCodes));
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

module.exports.setDeviceConfigVer = function(grunt, device, cb) {
  var value = {version: appiumVer};
  exports.writeConfigKey(grunt, device, value, cb);
};

module.exports.writeConfigKey = function(grunt, key, value, cb) {
  var configPath = path.resolve(__dirname, ".appiumconfig");
  fs.readFile(configPath, function(err, data) {
    var writeConfig = function(config) {
      config[key] = value;
      grunt.log.write("\n");
      grunt.log.write(JSON.stringify(config));
      fs.writeFile(configPath, JSON.stringify(config), cb);
    };
    if (err) {
      grunt.log.write("Config file doesn't exist, creating it");
      var config = {};
      writeConfig(config);
    } else {
      grunt.log.write("Config file exists, updating it");
      writeConfig(JSON.parse(data.toString('utf8')));
    }
  });
};

module.exports.setGitRev = function(grunt, rev, cb) {
  exports.writeConfigKey(grunt, "git-sha", rev, cb);
};

module.exports.authorize = function(grunt, cb) {
  // somewhat messily ported from penguinho's authorize.py
  var authFile = '/System/Library/Security/authorization.plist';
  if (!fs.existsSync(authFile)) {
    // on Mountain Lion auth is in a different place
    authFile = '/etc/authorization';
  }
  exec('DevToolsSecurity --enable', function(err, stdout, stderr) {
    if (err) throw err;
    fs.readFile(authFile, 'utf8', function(err, data) {
      if (err) throw err;
      var origData = data;
      var re = /<key>system.privilege.taskport<\/key>\s*\n\s*<dict>\n\s*<key>allow-root<\/key>\n\s*(<[^>]+>)/;
      var match = re.exec(data);
      if (!match) {
        grunt.fatal("Could not find the system.privilege.taskport key in " +
                    authFile);
      } else {
        if (!(/<false\/>/.exec(match[0]))) {
          console.log(authFile + " has already been modified to support appium");
          return cb();
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
                    grunt.log.writeln("Wrote new " + authFile);
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

module.exports.build = function(appRoot, cb, sdk, xcconfig) {
  var next = function() {
    var cmd = 'xcodebuild -sdk ' + sdk + ' clean';
    console.log('Using sdk: ' + sdk + '...');
    console.log("Cleaning build...");
    var xcode = exec(cmd, {cwd: appRoot, maxBuffer: MAX_BUFFER_SIZE}, function(err, stdout, stderr) {
      if (err) {
        console.log("Failed cleaning app, maybe it doesn't exist?");
        return cb(stdout + "\n" + stderr);
      }
      console.log("Building app...");
      var args = ['-sdk', sdk];
      if (typeof xcconfig !== "undefined") {
        args = args.concat(['-xcconfig', xcconfig]);
      }
      xcode = spawn('xcodebuild', args, {
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
    });
  };
  if (typeof sdk === "undefined") {
    getXcodeVersion(function(err, version) {
      if (err) return cb(err);
      var sdkVersion = version[0] === "5" ? "7.0" : "6.1";
      sdk = 'iphonesimulator' + sdkVersion;
      next();
    });
  } else {
    next();
  }
};

module.exports.buildApp = function(appDir, cb, sdk) {
  var appRoot = path.resolve(__dirname, "sample-code", "apps", appDir);
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
  var appPath = path.resolve(__dirname, "sample-code", "apps", appName,
      "build", "Release-iphonesimulator");
  exec("codesign -f -s \"" + certName + "\" -v " + appName + ".app", {cwd: appPath, maxBuffer: MAX_BUFFER_SIZE}, function(err, stdout, stderr) {
    console.log(stdout);
    console.log(stderr);
    if (err) {
      cb(false);
    } else {
      cb(true);
    }
  });
};

module.exports.buildSafariLauncherApp = function(cb, sdk, xcconfig) {
  var appRoot = path.resolve(__dirname, "submodules", "SafariLauncher");
  module.exports.build(appRoot, function(err) {
    if (err !== null) {
      console.log(err);
      cb(false);
    } else {
      cb(true);
    }
  }, sdk, xcconfig);
};


var setupAndroidProj = function(grunt, projPath, args, cb) {
  if (!process.env.ANDROID_HOME) {
    grunt.fatal("Could not find Android SDK, make sure to export ANDROID_HOME");
  }
  var tool = "android";
  if (isWindows) {
    tool = "android.bat";
  }
  var cmd = path.resolve(process.env.ANDROID_HOME, "tools", tool);
  if (!fs.existsSync(cmd)) {
    grunt.fatal("The `android` command was not found at \"" + cmd + "\", are you sure ANDROID_HOME is set properly?");
  }
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
    cb(code === 0 ? null : new Error("Setup failed with code " + code));
  });
};

module.exports.setupAndroidBootstrap = function(grunt, cb) {
  var projPath = path.resolve(__dirname, "lib", "devices", "android",
      "bootstrap");
  var args = ["create", "uitest-project", "-n", "AppiumBootstrap", "-t",
              "android-18", "-p", "."];
  // TODO: possibly check output of `android list target` to make sure api level 18 is available?
  setupAndroidProj(grunt, projPath, args, cb);
};

module.exports.setupAndroidApp = function(grunt, appName, cb) {
  var appPath = path.resolve(__dirname, "sample-code", "apps", appName);
  var args = ["update", "project", "--subprojects", "-t", "android-18", "-p", "."];
  setupAndroidProj(grunt, appPath, args, cb);
};

var buildAndroidProj = function(grunt, projPath, target, cb) {
  var cmdName = 'ant';
  if (!fs.existsSync(path.resolve(projPath, "build.xml")) &&
      fs.existsSync(path.resolve(projPath, "pom.xml"))) {
      cmdName = 'mvn';
  }
  var whichCmd = 'which ';
    if (isWindows) {
        whichCmd = 'where ';
    }
    exec(whichCmd + cmdName, { maxBuffer: MAX_BUFFER_SIZE }, function(err, stdout) {
    if (err) {
      grunt.fatal("Error finding " + cmdName + " binary, is it on your path?");
    } else {
      if (stdout) {
        var cmd = stdout.split('\r\n')[0].trim();
        grunt.log.write("Using " + cmdName + " found at " + cmd);
        var proc = spawn(cmd, [target], {cwd: projPath});
        proc.stdout.setEncoding('utf8');
        proc.stderr.setEncoding('utf8');
        proc.stdout.on('data', function(data) {
          grunt.log.write(data);
        });
        proc.stderr.on('data', function(data) {
          grunt.log.write(data);
        });
        proc.on('exit', function(code) {
          cb(code ? new Error("Building project exited with " + code) : null);
        });
      } else {
        grunt.fatal("Could not find " + cmdName + " installed; please make sure it's on PATH");
      }
    }
  });
};

module.exports.buildAndroidBootstrap = function(grunt, cb) {
  var projPath = path.resolve(__dirname, "lib", "devices", "android",
      "bootstrap");
  var binSrc = path.resolve(projPath, "bin", "AppiumBootstrap.jar");
  var binDestDir = path.resolve(__dirname, "build", "android_bootstrap");
  var binDest = path.resolve(binDestDir, "AppiumBootstrap.jar");
  buildAndroidProj(grunt, projPath, "build", function(err) {
    if (err) {
      console.log("Could not build android bootstrap");
      return cb(err);
    }
    mkdirp(binDestDir, function(err) {
      if (err) {
        console.log("Could not mkdirp " + binDestDir);
        return cb(err);
      }
      rimraf(binDest, function(err) {
        if (err) {
          console.log("Could not delete old " + binDest);
          return cb(err);
        }
        ncp(binSrc, binDest, function(err) {
          if (err) {
            console.log("Could not copy " + binSrc + " to " + binDest);
            return cb(err);
          }
          cb();
        });
      });
    });
  });
};

module.exports.buildSelendroidServer = function(cb) {
  console.log("Building selendroid server");
  getSelendroidVersion(function(err, version) {
    if (err) return cb(err);
    var buildDir = path.resolve(__dirname, "submodules", "selendroid");
    var target = path.resolve(buildDir, "selendroid-server", "target",
      "selendroid-server-" + version + ".apk");
    var destDir = path.resolve(__dirname, "build", "selendroid");
    var destBin = path.resolve(destDir, "selendroid.apk");
    var srcManifest = path.resolve(__dirname, "submodules", "selendroid",
      "selendroid-server", "AndroidManifest.xml");
    var dstManifest = path.resolve(destDir, "AndroidManifest.xml");
    var cmd = "mvn clean install";
    exec(cmd, {cwd: buildDir, maxBuffer: MAX_BUFFER_SIZE}, function(err, stdout, stderr) {
      if (err) {
        console.error("Unable to build selendroid server. Stdout was: ");
        console.error(stdout);
        console.error(stderr);
        return cb(err);
      }
      console.log("Making sure target exists");
      fs.stat(target, function(err) {
        if (err) {
          console.error("Selendroid doesn't exist! Not sure what to do.");
          return cb(err);
        }
        console.log("Selendroid server built successfully, copying to build/selendroid");
        rimraf(destDir, function(err) {
          if (err) {
            console.error("Could not remove " + destDir);
            return cb(err);
          }
          mkdirp(destDir, function(err) {
            if (err) {
              console.error("Could not create " + destDir);
              return cb(err);
            }
            ncp(target, destBin, function(err) {
              if (err) {
                console.error("Could not copy " + target + " to " + destBin);
                return cb(err);
              }
              console.log("Copying selendroid manifest as well");
              ncp(srcManifest, dstManifest, function(err) {
                if (err) {
                  console.error("Could not copy manifest");
                  return cb(err);
                }
                console.log("Modifying manifest for no icons");
                fs.readFile(dstManifest, function(err, data) {
                  if (err) {
                    console.error("Could not open new manifest");
                    return cb(err);
                  }
                  data = data.toString('utf8');
                  console.log(data);
                  var iconRe = /application[\s\S]+android:icon="[^"]+"/;
                  data = data.replace(iconRe, "application");
                  fs.writeFile(dstManifest, data, function(err) {
                    if (err) {
                      console.error("Could not write modified manifest");
                      return cb(err);
                    }
                    cb(null);
                  });
                });
              });
            });
          });
        });
      });
    });
  });
};

var getSelendroidVersion = function(cb) {
  console.log("Getting Selendroid version");
  var pomXml = path.resolve(__dirname, "submodules", "selendroid",
      "selendroid-server", "pom.xml");
  fs.readFile(pomXml, function(err, xmlData) {
    if (err) {
      console.error("Could not find selendroid's pom.xml at");
      return cb(err);
    }
    parseXmlString(xmlData.toString('utf8'), function(err, res) {
      if (err) {
        console.error("Error parsing selendroid's pom.xml");
        return cb(err);
      }
      var version = res.project.parent[0].version[0];
      if (typeof version === "string") {
        console.log("Selendroid version is " + version);
        cb(null, version);
      } else {
        cb(new Error("Version " + version + " was not valid"));
      }
    });
  });
};

module.exports.buildAndroidApp = function(grunt, appName, cb) {
  var appPath = path.resolve(__dirname, "sample-code", "apps", appName);
  buildAndroidProj(grunt, appPath, "debug", cb);
};

module.exports.buildSelendroidAndroidApp = function(grunt, appName, cb) {
  var appPath = path.resolve(__dirname, "sample-code", "apps" + appName);
  buildAndroidProj(grunt, appPath, "package", cb);
};

module.exports.installAndroidApp = function(grunt, appName, cb) {
  var pkgMap = {'ApiDemos': 'com.example.android.apis'};
  if (!_.has(pkgMap, appName)) {
    var msg = "We don't know about appName " + appName + ", please edit " +
              "grunt-helpers.js:installAndroidApp() to add it and its " +
              "package identifier";
    grunt.fatal(new Error(msg));
  }

  var appPath = path.resolve(__dirname, "sample-code", "apps", appName,
      "bin/" + appName + "-debug.apk");
  exec("adb uninstall " + pkgMap[appName], { maxBuffer: MAX_BUFFER_SIZE }, function(err, stdout) {
    if (err) return grunt.fatal(err);
    grunt.log.write(stdout);
    exec("adb install -r " + appPath, { maxBuffer: MAX_BUFFER_SIZE }, function(err, stdout) {
      if (err) return grunt.fatal(err);
      grunt.log.write(stdout);
      cb();
    });
  });
};

module.exports.generateServerDocs = function(grunt, cb) {
  var p = parser();
  var docFile = path.resolve(__dirname, "docs/server-args.md");
  var md = "Appium server arguments\n==========\n\n";
  md += "Usage: `node . [flags]`\n\n";
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
    var readmeLex = namp.lexer(readme)
      , headers = getMarkdownHeaders(readmeLex)
      , sidebarHtml = generateSidebarHtml(headers)
      , warning = "<!-- THIS FILE IS AUTOMATICALLY GENERATED DO NOT EDIT -->\n"
      , bodyHtml = generateBodyHtml(readmeLex, headers)
      , submod = path.resolve(__dirname, "submodules", "appium.io")
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
                  'git push origin master && ' +
                  'git checkout gh-pages && ' +
                  'git pull origin gh-pages && ' +
                  'git merge master && ' +
                  'git push origin gh-pages && ' +
                  'git checkout master';
        exec(cmd, {cwd: submod, maxBuffer: MAX_BUFFER_SIZE}, function(err, stdout, stderr) {
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
  var templateFile = path.resolve(__dirname, "submodules", "appium.io", "getting-started-template.html")
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
      headers[mdObj.text] = sanitizeMdHeader(mdObj.text);
    }
  });
  return headers;
};

var mdObjIsHeader = function(mdObj) {
  return mdObj.depth === 2 && mdObj.type === 'heading';
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
    header = namp(header).html;
    header = header.replace(/<[^>]+>/ig, "");
    html += '<li><a href="#' + link + '"><i class="icon-chevron-right"></i> ' +
            header + '</a></li>\n';
  });
  return html;
};

var generateBodyHtml = function(readmeMd, headers) {
  var html = ''
    , inBetweens = []
    , inBetweenHtml = ''
    , inSection = false;
  var addInBetweenHtml = function() {
    if (inBetweens.length) {
      inBetweenHtml = namp.parser(inBetweens)[0];
      html += inBetweenHtml;
      inBetweens = [];
    }
  };

  for (var i = 1; i < readmeMd.length; i++) {
    var mdObj = readmeMd[i];
    if (mdObjIsHeader(mdObj)) {
      addInBetweenHtml();
      var headerHtml = namp.parser([mdObj])[0];
      headerHtml = headerHtml.replace(/<.?p>/ig, '');
      if (inSection) {
        html += '</section>\n';
      }
      html += '<section id="' + headers[mdObj.text] + '">\n';
      html += '<h2>\n<a href="#' + headers[mdObj.text] + '" class="anchor" ' +
              'name="requirements">\n<span class="mini-icon mini-icon-link">' +
              '</span>\n</a>\n' +  headerHtml + '\n</h2>\n\n';
      inSection = true;
    } else if (inSection) {
      inBetweens.push(mdObj);
    }
    if (i === readmeMd.length - 1) {
      addInBetweenHtml();
    }
  }
  html += '</section>';
  return html;
};
