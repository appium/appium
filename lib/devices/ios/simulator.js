"use strict";

var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , fs = require('fs')
  , async = require('async')
  , exec = require('child_process').exec
  , path = require('path')
  , ncp = require('ncp')
  , xcode = require('./xcode.js')
  , multiResolve = require('../../helpers.js').multiResolve
  , rimraf = require('rimraf')
  , xmlplist = require('plist')
  , bplistCreate = require('bplist-creator')
  , bplistParse = require('bplist-parser');

var Simulator = function (opts) {
  var requiredOpts = ['sdkVer', 'platformVer', 'udid'];
  _.each(requiredOpts, function (opt) {
    if (!_.has(opts, opt)) {
      throw new Error(opt + " is required");
    }
    this[opt] = opts[opt];
  }.bind(this));
};

var wrapInArray = function (res) {
  if (res) {
    return [res];
  } else {
    return [];
  }
};

var rmrf = function (path, cb) {
  exec("rm -rf " + path, function (err) {
    cb(err);
  });
};

Simulator.prototype.simctl = function (cmd, args, cb) {
  if (typeof args === "function") {
    cb = args;
    args = [];
  }
  args = _.map(args, function (arg) {
    if (args.indexOf(" ") !== -1) {
      return '"' + arg + '"';
    }
    return arg;
  });
  cmd = "xcrun simctl " + cmd + " " + this.udid + " " + args.join(' ');
  logger.debug("Executing: " + cmd);
  exec(cmd, function (err, stdout, stderr) {
    if (err) return cb(err);
    if (stdout) {
      logger.debug("Result: " + stdout);
    }
    if (stdout) {
      logger.debug("Result stderr: " + stderr);
    }
    cb();
  });
};

Simulator.prototype.getRootDir = function () {
  var u = process.env.USER;
  if (parseFloat(this.sdkVer) >= 8) {
    return path.resolve("/Users", u, "Library", "Developer",
      "CoreSimulator", "Devices");
  }

  return path.resolve("/Users", u, "Library", "Application Support",
    "iPhone Simulator");
};

Simulator.prototype.getDirs = function () {
  var base;
  if (parseFloat(this.sdkVer) >= 8) {
    base = path.resolve(this.getRootDir(), this.udid, "data");
    if (fs.existsSync(base)) {
      return [base];
    }
    return [];
  } else {
    var sdk = this.sdkVer.toString();
    base = this.getRootDir();
    var list = [];
    try {
      list = fs.readdirSync(base);
    } catch (e) {
    }
    var dirs = [];
    _.each(list, function (sdkDir) {
      if (sdkDir.indexOf(sdk) !== -1) {
        dirs.push(path.resolve(base, sdkDir));
      }
    });
    return dirs;
  }
};

Simulator.getPlistData = function (file) {
  var data;
  if (fs.existsSync(file)) {
    var fileData = fs.readFileSync(file);
    try {
      data = bplistParse.parseBuffer(fileData)[0];
    } catch (err) {
      if (err.message.indexOf("Invalid binary plist") !== -1) {
        logger.debug("Plist was not binary format, retrying with xml");
        data = xmlplist(file)[0];
      } else {
        throw err;
      }
    }
  } else {
    throw new Error("Settings file " + file + " did not exist");
  }
  return data;
};

var findAppByCondition = function (dir, condition) {
  var list;
  try {
    list = fs.readdirSync(dir);
  } catch (e) {
    if (/ENOENT/.test(e.message)) {
      logger.warn("Applications directory " + dir + " doesn't exist. " +
                  "Have you run this simulator before?");
      return null;
    }
    throw e;
  }
  var appDir = null;
  for (var i = 0; i < list.length; i++) {
    if (condition(list[i])) {
      appDir = path.resolve(dir, list[i]);
      break;
    }
  }
  return appDir;
};

Simulator.prototype.getSafariDirs = function () {
  if (parseFloat(this.platformVer) >= 8) {
    return wrapInArray(this.getSafari8Dir());
  } else {
    return this.getSafari7Dirs();
  }
};

Simulator.prototype.getAppDirs = function (appFile, appBundleId) {
  if (parseFloat(this.platformVer) >= 8) {
    var dataDirs = wrapInArray(this.getApp8Dir(appBundleId, "Data"));
    var bundleDirs = wrapInArray(this.getApp8Dir(appBundleId, "Bundle"));
    return dataDirs.concat(bundleDirs);
  } else {
    return this.getApp7Dirs(appFile);
  }
};

Simulator.prototype.getSafari7Dirs = function () {
  return this.getApp7Dirs(["MobileSafari.app", "Appium-MobileSafari.app"]);
};

Simulator.prototype.getApp7Dirs = function (appFiles) {
  var appsDirs = multiResolve(this.getDirs(), "Applications");
  var foundAppDirs = [];
  _.each(appsDirs, function (appsDir) {
    var cond = function (d) {
      var found = false;
      _.each(appFiles, function (appFile) {
        found = found || fs.existsSync(path.resolve(appsDir, d, appFile));
      });
      return found;
    };
    var appDir = findAppByCondition(appsDir, cond);
    if (appDir !== null) {
      foundAppDirs.push(appDir);
    }
  });
  return foundAppDirs;
};

Simulator.prototype.getSafari8Dir = function () {
  return this.getApp8Dir("com.apple.mobilesafari", "Data");
};

Simulator.prototype.getApp8Dir = function (bundleId, dataOrBundle) {
  var root = this.getDirs()[0];
  if (!root) {
    return null;
  }
  var appsDir = path.resolve(root, "Containers", dataOrBundle, "Application");
  var magicFile = ".com.apple.mobile_container_manager.metadata.plist";
  var cond = function (d) {
    var magicPlist = path.resolve(appsDir, d, magicFile);
    if (!fs.existsSync(magicPlist)) {
      return false;
    }
    var data = Simulator.getPlistData(magicPlist);
    return data.MCMMetadataIdentifier === bundleId;
  };
  return findAppByCondition(appsDir, cond);
};

Simulator.prototype.dirsExist = function () {
  return this.getDirs().length > 0;
};

Simulator.prototype.safariDirsExist = function () {
  try {
    return this.getSafariDirs().length > 0;
  } catch (e) {
    return false;
  }
};

Simulator.prototype.cleanSafari = function (keepPrefs, cb) {
  // this method is async because we use glob paths for deletes and rimraf
  // can't handle them, so we use our own async 'rmrf' model that calls out
  // to shell to do it
  logger.debug("Cleaning mobile safari data files");
  if (!this.dirsExist()) {
    logger.info("Couldn't find Safari support directories to clean out old " +
                "data. Probably there's nothing to clean out");
    return;
  }

  var libraryDirs = multiResolve(this.getDirs(), 'Library');
  var safariLibDirs = multiResolve(this.getSafariDirs(), 'Library');
  var toDeletes = [
    'Caches/Snapshots/com.apple.mobilesafari'
    , 'Caches/com.apple.mobilesafari/Cache.db*'
    , 'Caches/com.apple.WebAppCache/*.db'
    , 'Safari/*.plist'
    , 'WebKit/LocalStorage/*.*'
    , 'WebKit/GeolocationSites.plist'
    , 'Cookies/*.binarycookies'
  ];
  var deleteActions = [];

  var buildLibraryDeletes = function (libDirs, toDeletes) {
    _.each(libDirs, function (libraryDir) {
      _.each(toDeletes, function (relRmPath) {
        var rmPath = path.resolve(libraryDir, relRmPath);
        deleteActions.push(function (cb) {
          logger.debug("Deleting " + rmPath);
          rmrf(rmPath, cb);
        });
      });
    });
  };

  var safariToDeletes = _.clone(toDeletes);
  if (!keepPrefs) {
    safariToDeletes.push('Preferences/*.plist');
  }

  buildLibraryDeletes(libraryDirs, toDeletes);
  buildLibraryDeletes(safariLibDirs, safariToDeletes);

  async.parallel(deleteActions, cb);
};

Simulator.prototype.deleteSafari = function () {
  logger.debug("Deleting Safari apps");
  var safariDirs = multiResolve(this.getSafariDirs());
  if (parseFloat(this.platformVer) >= 8) {
    var safariBundleDir = this.getApp8Dir("com.apple.mobilesafari", "Bundle");
    safariDirs = safariDirs.concat(wrapInArray(safariBundleDir));
  }
  _.each(safariDirs, function (safariDir) {
    logger.debug("Deleting " + safariDir);
    rimraf.sync(safariDir);
  });
};

Simulator.prototype.cleanCustomApp = function (appFile, appBundleId) {
  logger.debug("Cleaning app data files");
  var appDirs = this.getAppDirs(appFile, appBundleId);
  if (appDirs.length === 0) {
    logger.info("Couldn't find app directories to delete. Probably it's not " +
                "installed");
    return;
  }
  _.each(appDirs, function (appDir) {
    logger.debug("Deleting " + appDir);
    rimraf.sync(appDir);
  });
};

Simulator.prototype.cleanSim = function (keepKeychains) {
  logger.debug("Cleaning sim data files");
  if (!this.dirsExist()) {
    logger.info("Couldn't find support directories to clean out old " +
                "data. Probably there's nothing to clean out");
    return;
  }
  var toDeletes = [
    'Library/TCC',
    'Library/Caches/locationd',
    'Media'
  ];
  if (!keepKeychains) {
    toDeletes.push('Library/Keychains');
  }
  _.each(this.getDirs(), function (simDir) {
    _.each(toDeletes, function (relRmPath) {
      var rmPath = path.resolve(simDir, relRmPath);
      logger.debug("Deleting " + rmPath);
      rimraf.sync(rmPath);
    });
  });

  logger.debug("Cleaning sim preferences");
  var prefsPlist = Simulator.getSimAppPrefsFile();
  var data = Simulator.getPlistData(prefsPlist);
  var keysToClear = [
    'CurrentDeviceUDID',
    'SimulateDevice'
  ];
  var changed = false;
  _.each(keysToClear, function (key) {
    if (_.has(data, key)) {
      logger.debug("Clearing key: " + key);
      delete data[key];
      changed = true;
    }
  });
  if (changed) {
    logger.debug("Writing new preferences plist data");
    fs.writeFileSync(prefsPlist, bplistCreate(data));
  }
};

Simulator.prototype.moveBuiltInApp = function (appPath, appName, newAppDir, cb) {
  ncp(appPath, newAppDir, function (err) {
    if (err) return cb(err);
    logger.debug("Copied " + appName + " to " + newAppDir);
    rimraf(appPath, function (err) {
      if (err) {
        if (err.message.indexOf("EACCES") !== -1) {
          return cb(new Error("We don't have write access to " + appPath +
                    ", please re-run authorize as " + process.env.USER));
        }
        return cb(err);
      }
      logger.debug("Temporarily deleted original app at " + appPath);
      cb(null, newAppDir, appPath);
    });
  });
};

Simulator.prototype.getBuiltInApp = function (appName, cb) {
  this.getBuiltInAppDir(function (err, appDir) {
    if (err) return cb(err);
    var appPath = path.resolve(appDir, appName + ".app");
    fs.stat(appPath, function (err, s) {
      if (err && err.message.indexOf("ENOENT") !== -1) {
        logger.debug("App is not at " + appPath);
        return cb(err);
      }
      cb(null, s, appPath);
    });
  });
};

Simulator.prototype.prepareBuiltInApp = function (appName, tmpDir, cb) {
  logger.debug("Looking for built in app " + appName);
  var newAppDir = path.resolve(tmpDir, 'Appium-' + appName + '.app');
  var checkApp = function (s, appPath, cb) {
    if (!s.isDirectory()) {
      cb(new Error("App package was not a directory"), appPath);
      return false;
    }
    return true;
  };
  this.getBuiltInApp(appName, function (err, s, appPath) {
    if (err) {
      fs.stat(newAppDir, function (err, s) {
        if (err) {
          logger.warn("App is also not at " + newAppDir);
          return cb(new Error("Couldn't find built in app in its home " +
                              "or temp dir!"));
        }
        if (checkApp(s, appPath, cb)) {
          logger.debug("Couldn't find original app, but found the temp " +
                      "Appium one so using that");
          cb(null, newAppDir, appPath);
        }
      });
      return;
    }
    if (checkApp(s, appPath, cb)) {
      if (parseInt(this.platformVer, 10) < 7) {
        logger.debug("Got app, trying to copy " + appPath + " to tmp dir");
        ncp(appPath, newAppDir, function (err) {
          if (err) return cb(err);
          logger.debug("Copied " + appName);
          cb(null, newAppDir, null);
        });
      } else {
        logger.debug("Got app, trying to move " + appPath + " to tmp dir");
        this.moveBuiltInApp(appPath, appName, newAppDir, cb);
      }
    }
  }.bind(this));
};

Simulator.prototype.getBuiltInAppDir = function (cb) {
  xcode.getPath(function (err, xcodeDir) {
    if (err) return cb(err);
    var appDir = path.resolve(xcodeDir, "Platforms/iPhoneSimulator.platform/" +
                              "Developer/SDKs/iPhoneSimulator" +
                              this.platformVer + ".sdk/Applications/");
    fs.stat(appDir, function (err, s) {
      if (err) {
        cb(err);
      } else if (!s.isDirectory()) {
        cb(new Error("Could not load built in applications directory"));
      } else {
        cb(null, appDir);
      }
    });
  }.bind(this));
};

Simulator.prototype.prepareSafari = function (tmpDir, cb) {
  this.prepareBuiltInApp("MobileSafari", tmpDir, cb);
};

Simulator.prototype.preparePreferencesApp = function (tmpDir, cb) {
  this.prepareBuiltInApp("Preferences", tmpDir, cb);
};

Simulator.prototype.deleteSim = function () {
  var root = this.getRootDir();
  logger.debug("Deleting simulator folder: " + root);
  rimraf.sync(root);
};

Simulator.prototype.setLocale = function (language, locale, calendar) {
  var globalPrefs = multiResolve(this.getDirs(), "Library", "Preferences",
                                 ".GlobalPreferences.plist");
  _.each(globalPrefs, function (plist) {
    var data = Simulator.getPlistData(plist);
    var curLocaleAndCal = data.AppleLocale || null;
    var supportedLangs = data.AppleLanguages || [];
    var newLangs = [];
    if (language) {
      logger.debug("New language: " + language);
      newLangs.push(language);
      newLangs = newLangs.concat(_.without(supportedLangs, language));
      data.AppleLanguages = newLangs;
    }
    if (locale || calendar) {
      var calSplit = "@calendar=";
      if (curLocaleAndCal === null) {
        curLocaleAndCal = language || 'en';
      }
      var curLoc = curLocaleAndCal.split(calSplit)[0];
      var newLocaleAndCal = locale ? locale : curLoc;
      if (calendar) {
        newLocaleAndCal += calSplit + calendar;
      }
      logger.debug("New locale: " + newLocaleAndCal);
      data.AppleLocale = newLocaleAndCal;
    }

    logger.debug("Writing new locale plist data");
    fs.writeFileSync(plist, bplistCreate(data));
  });
};

Simulator.getSimAppPrefsFile = function () {
  var u = process.env.USER;
  return path.resolve("/Users", u, "Library", "Preferences",
                      "com.apple.iphonesimulator.plist");
};

module.exports = Simulator;
