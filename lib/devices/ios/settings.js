"use strict";

var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , fs = require('fs')
  , path = require('path')
  , xmlplist = require('plist')
  , bplistCreate = require('bplist-creator')
  , mkdirp = require('mkdirp')
  , bplistParse = require('bplist-parser');

var settings = {};
var plists = {
  locationServices: 'com.apple.locationd.plist',
  webInspector: 'com.apple.webInspector.plist',
  mobileSafari: 'com.apple.mobilesafari.plist',
  webFoundation: 'com.apple.WebFoundation.plist',
  preferences: 'com.apple.Preferences.plist',
  locationClients: 'clients.plist',
  locationCache: 'cache.plist',
  userSettings: 'UserSettings.plist',
  effUserSettings: 'EffectiveUserSettings.plist'
};

var prefs = {
  mobileSafari: {
    OpenLinksInBackground: [0, 1],
    WebKitJavaScriptCanOpenWindowsAutomatically: [true, false],
    SearchEngineStringSetting: ['Google', 'Yahoo!', 'Bing'],
    SafariDoNotTrackEnabled: [true, false],
    SuppressSearchSuggestions: [true, false],
    SpeculativeLoading: [true, false],
    WarnAboutFraudulentWebsites: [true, false],
    ReadingListCellularFetchingEnabled: [true, false],
    WebKitJavaScriptEnabled: [true, false]
  },
  webFoundation: {
    NSHTTPAcceptCookies: ['never', 'always', 'current page']
  },
  webInspector: {
    RemoteInspectorEnabled: [true, false]
  },
  locationServices: {
    LocationServicesEnabled: [0, 1],
    'LocationServicesEnabledIn7.0': [0, 1],
    ObsoleteDataDeleted: [true, false]
  },
  preferences: {
    KeyboardCapsLock: [true, false],
    KeyboardAutocapitalization: [true, false],
    KeyboardAutocorrection: [true, false],
    KeybordCheckSpelling: [true, false],
    KeyboardPeriodShortcut: [true, false]
  }
};

var multiResolve = function (roots) {
  var args = Array.prototype.slice.call(arguments, 1);
  var paths = [];
  _.each(roots, function (root) {
    var resolveArgs = [root].concat(args);
    paths.push(path.resolve.apply(null, resolveArgs));
  });
  return paths;
};

var getPlistPaths = function (plist, sdk) {
  var files;
  var file = plists[plist];
  var bases = getPrefsDirs(sdk);
  if (plist === 'mobileSafari' && parseFloat(sdk) >= 7) {
    bases = getSafari7Dirs(sdk);
  } else if (plist === 'locationClients') {
    bases = multiResolve(getSimDirs(sdk), "Library", "Caches", "locationd");
  } else if (plist === 'locationCache') {
    var bases2 = multiResolve(getSimDirs(sdk), "Library", "Caches", "locationd");
    files = multiResolve(bases, file);
    files = files.concat(multiResolve(bases2, file));
    return files;
  } else if (plist === 'userSettings') {
    files = multiResolve(getSimDirs(sdk), "Library", "ConfigurationProfiles", file);
    files = files.concat(multiResolve(getSimDirs(sdk), "Library", "ConfigurationProfiles",
        "PublicInfo", 'EffectiveUserSettings.plist'));
    return files;
  }

  return multiResolve(bases, file);
};

settings.getSimRoot = function () {
  var u = process.env.USER;
  return path.resolve("/Users", u, "Library", "Application Support",
    "iPhone Simulator");
};

settings.getSimRootsWithVersion = function (sdk) {
  sdk = sdk.toString();
  var base = settings.getSimRoot();
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
};

var getSimDirs = settings.getSimRootsWithVersion;

var getPrefsDirs = function (sdk) {
  return multiResolve(getSimDirs(sdk), "Library", "Preferences");
};

var getSafari7Dirs = function (sdk) {
  var appsDirs = multiResolve(getSimDirs(sdk), "Applications");
  var safariDirs = [];
  _.each(appsDirs, function (appsDir) {
    var list;
    try {
      list = fs.readdirSync(appsDir);
    } catch (e) {
      if (/ENOENT/.test(e.message)) {
        logger.warn("Applications directory " + appsDir + " doesn't exist. " +
                    "Have you run this simulator before?");
        return;
      }
      throw e;
    }
    var safariDir = null;
    for (var i = 0; i < list.length; i++) {
      if (fs.existsSync(path.resolve(appsDir, list[i], "MobileSafari.app")) ||
          fs.existsSync(path.resolve(appsDir, list[i], "Appium-MobileSafari.app"))) {
        safariDir = path.resolve(appsDir, list[i], "Library", "Preferences");
        break;
      }
    }
    if (safariDir) {
      safariDirs.push(safariDir);
    } else {
      logger.warn("Could not find MobileSafari in sim applications at " +
                  appsDir);
    }
  });
  return safariDirs;
};

var checkValidSettings = function (forPlist, prefSet) {
  var e = null;
  if (!_.has(plists, forPlist) || !_.has(prefs, forPlist)) {
    e = new Error("plist type " + forPlist + " doesn't exist");
  }

  _.each(prefSet, function (prefValue, prefName) {
    if (!_.has(prefs[forPlist], prefName)) {
      e = new Error("plist type " + forPlist + " has no option " +
                        prefName);
    }
    if (!_.contains(prefs[forPlist][prefName], prefValue)) {
      e = new Error("plist type " + forPlist + ", option " + prefName +
                        " has no possible value " + prefValue);
    }
  });

  if (e !== null) {
    logger.error(e.message);
    throw e;
  }
};

settings.writeSettings = function (forPlist, prefSetPerFile, bypassCheck,
    makeDirs) {
  if (typeof makeDirs === "undefined") {
    makeDirs = false;
  }
  var filesWritten = 0;
  _.each(prefSetPerFile, function (prefSet, plistPath) {
    logger.debug("Writing settings for " + forPlist + " to " + plistPath + ":");
    logger.debug(JSON.stringify(prefSet));
    if (!bypassCheck) {
      checkValidSettings(forPlist, prefSet);
    }
    var baseDir = path.dirname(plistPath);
    if (!fs.existsSync(baseDir)) {
      logger.warn("Base directory " + baseDir + " doesn't exist, creating it");
      mkdirp.sync(baseDir);
    }
    prefSet = [prefSet];  // need to wrap in an array to get written correctly
    try {
      fs.unlinkSync(plistPath);
    } catch (e) {}
    try {
      fs.writeFileSync(plistPath, bplistCreate(prefSet));
      filesWritten++;
    } catch (e) {
      logger.warn("Could not write to " + plistPath);
    }
  });
  if (filesWritten === 0) {
    logger.warn("Could not write any settings files; is the first time " +
        "you've launched the sim? The directories might not exist yet");
  }
};

settings.updateSettings = function (sdk, forPlist, prefSet) {
  logger.debug("Updating settings for " + forPlist);
  checkValidSettings(forPlist, prefSet);
  var prefSetPerFile = {};
  var curSettings = settings.getSettings(sdk, forPlist);
  _.each(curSettings, function (settingSet, file) {
    _.each(prefSet, function (prefValue, prefName) {
      settingSet[prefName] = prefValue;
    });
    prefSetPerFile[file] = settingSet;
  });
  settings.writeSettings(forPlist, prefSetPerFile, true);
};

settings.updateLocationSettings = function (sdk, bundleId, authorized) {
  var weirdLocKey = "com.apple.locationd.bundle-/System/Library/" +
                    "PrivateFrameworks/AOSNotification.framework";
  var newPrefs = {
    BundleId: bundleId,
    Authorized: !!authorized,
    Whitelisted: false,
  };
  var newCachePrefs = {
    LastFenceActivityTimestamp: 412122103.232983,
    CleanShutdown: true
  };
  var prefSetPerFile = {};
  var cachePrefSetPerFile = {};
  var curCacheSettings = settings.getSettings(sdk, 'locationCache');
  _.each(curCacheSettings, function (settingSet, file) {
    cachePrefSetPerFile[file] = _.extend(_.clone(newCachePrefs), settingSet);
  });
  var curSettings = settings.getSettings(sdk, 'locationClients');
  _.each(curSettings, function (settingSet, file) {
    // add this random data to the clients.plist since it always seems to be there
    if (!_.has(settingSet, weirdLocKey)) {
      settingSet[weirdLocKey] = {
        BundlePath: "/System/Library/PrivateFrameworks/AOSNotification.framework",
        Whitelisted: false,
        Executable: "",
        Registered: ""
      };
    }
    // now add our app's data
    if (!_.has(settingSet, bundleId)) {
      settingSet[bundleId] = {};
    }
    _.extend(settingSet[bundleId], newPrefs);
    if (!_.has(settingSet, 'Executable')) {
      settingSet.Executable = "";
    }
    if (!_.has(settingSet, 'Registered')) {
      settingSet.Registered = "";
    }
    prefSetPerFile[file] = settingSet;
  });
  settings.writeSettings('locationClients', prefSetPerFile, true);
  settings.writeSettings('locationCache', cachePrefSetPerFile, true);
};

settings.updateSafariSettings = function (sdk, settingSet) {
  settings.updateSafariUserSettings(sdk, settingSet);
  settings.updateSettings(sdk, 'mobileSafari', settingSet);
};

settings.updateSafariUserSettings = function (sdk, settingSet) {
  // add extra stuff to UserSettings.plist and EffectiveUserSettings.plist
  var newUserSettings = {};
  if (_.has(settings, 'WebKitJavaScriptEnabled')) {
    newUserSettings.safariAllowJavaScript = settingSet.WebKitJavaScriptEnabled;
  }
  if (_.has(settings, 'WebKitJavaScriptCanOpenWindowsAutomatically')) {
    newUserSettings.safariAllowPopups = settingSet.WebKitJavaScriptCanOpenWindowsAutomatically;
  }
  if (_.has(settings, 'WarnAboutFraudulentWebsites')) {
    newUserSettings.safariForceFraudWarning = !settingSet.WarnAboutFraudulentWebsites;
  }
  if (_.size(newUserSettings) > 0) {
    logger.debug("Updating UserSettings.plist and friends");
    var userSettingsPerFile = {};
    var curUserSettings = settings.getSettings(sdk, 'userSettings');
    _.each(curUserSettings, function (settingSet, file) {
      _.extend(settingSet.restrictedBool, newUserSettings);
      userSettingsPerFile[file] = settingSet;
    });
    settings.writeSettings('userSettings', userSettingsPerFile, true);
  }
};

var getPlistData = function (file) {
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

settings.getSettings = function (sdk, forPlist) {
  var files = getPlistPaths(forPlist, sdk);
  var bplists = {};
  _.each(files, function (file) {
    logger.debug("Getting current settings for " + forPlist + " from " + file);
    try {
      bplists[file] = getPlistData(file);
    } catch (err) {
      bplists[file] = {};
      logger.warn(err.message);
    }
  });
  return bplists;
};

settings.simDirsExist = function (sdk) {
  return getSimDirs(sdk).length > 0;
};

settings.safari7DirsExist = function (sdk) {
  try {
    return getSafari7Dirs(sdk).length > 0;
  } catch (e) {
    return false;
  }
};

settings.locServicesDirsExist = function (sdk) {
  return getPlistPaths('locationClients', sdk).length > 0;
};

module.exports = settings;
