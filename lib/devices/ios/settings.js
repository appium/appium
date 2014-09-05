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
    JavaScriptCanOpenWindowsAutomatically: [true, false],
    SearchEngineStringSetting: ['Google', 'Yahoo!', 'Bing'],
    SafariDoNotTrackEnabled: [true, false],
    SuppressSearchSuggestions: [true, false],
    SpotlightSuggestionsEnabled: [true, false],
    SpeculativeLoading: [true, false],
    WarnAboutFraudulentWebsites: [true, false],
    ReadingListCellularFetchingEnabled: [true, false],
    WebKitJavaScriptEnabled: [true, false],
    JavaScriptEnabled: [true, false],
    DisableWebsiteSpecificSearch: [true, false]
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

var getPlistPaths = function (plist, sdk, udid) {
  var files;
  var file = plists[plist];
  var bases = getPrefsDirs(sdk, udid);
  if (plist === 'mobileSafari' && parseFloat(sdk) >= 7) {
    bases = getSafariDirs(sdk, udid);
  } else if (plist === 'locationClients') {
    bases = multiResolve(getSimDirs(sdk, udid), "Library", "Caches",
                         "locationd");
  } else if (plist === 'locationCache') {
    var bases2 = multiResolve(getSimDirs(sdk, udid), "Library", "Caches",
                              "locationd");
    files = multiResolve(bases, file);
    files = files.concat(multiResolve(bases2, file));
    return files;
  } else if (plist === 'userSettings') {
    files = multiResolve(getSimDirs(sdk, udid), "Library",
                         "ConfigurationProfiles", file);
    files = files.concat(multiResolve(getSimDirs(sdk, udid), "Library",
                         "ConfigurationProfiles", "PublicInfo",
                         "EffectiveUserSettings.plist"));
    files = files.concat(multiResolve(getSimDirs(sdk, udid), "Library",
                         "ConfigurationProfiles", "PublicInfo",
                         "PublicEffectiveUserSettings.plist"));
    return files;
  }

  return multiResolve(bases, file);
};

settings.getSimRoot = function (sdk) {
  var u = process.env.USER;
  if (parseFloat(sdk) >= 8) {
    return path.resolve("/Users", u, "Library", "Developer",
      "CoreSimulator", "Devices");
  }

  return path.resolve("/Users", u, "Library", "Application Support",
    "iPhone Simulator");
};

settings.getSimRootsWithVersion = function (sdk, udid) {
  var base;
  if (parseFloat(sdk) >= 8) {
    base = path.resolve(settings.getSimRoot(sdk), udid, "data");
    if (fs.existsSync(base)) {
      return [base];
    }
    return [];
  } else {
    sdk = sdk.toString();
    base = settings.getSimRoot();
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

var getSimDirs = settings.getSimRootsWithVersion;

var getPrefsDirs = function (sdk, udid) {
  return multiResolve(getSimDirs(sdk, udid), "Library", "Preferences");
};

var findSafariByCondition = function (dir, condition) {
  var list;
  try {
    list = fs.readdirSync(dir);
  } catch (e) {
    if (/ENOENT/.test(e.message)) {
      logger.warn("Applications directory " + dir + " doesn't exist. " +
                  "Have you run this simulator before?");
      return;
    }
    throw e;
  }
  var safariDir = null;
  for (var i = 0; i < list.length; i++) {
    if (condition(list[i])) {

      safariDir = path.resolve(dir, list[i], "Library", "Preferences");
      break;
    }
  }
  return safariDir;
};

var getSafariDirs = function (sdk, udid) {
  if (parseFloat(sdk) >= 8) {
    var dir = getSafari8Dir(sdk, udid);
    if (dir) {
      return [dir];
    } else {
      return [];
    }
  } else {
    return getSafari7Dirs(sdk);
  }
};

var getSafari7Dirs = function (sdk) {
  var appsDirs = multiResolve(getSimDirs(sdk), "Applications");
  var safariDirs = [];
  _.each(appsDirs, function (appsDir) {
    var cond = function (d) {
      return fs.existsSync(path.resolve(appsDir, d, "MobileSafari.app")) ||
          fs.existsSync(path.resolve(appsDir, d, "Appium-MobileSafari.app"));
    };
    var safariDir = findSafariByCondition(appsDir, cond);
    if (safariDir !== null) {
      safariDirs.push(safariDir);
    }
  });
  return safariDirs;
};

var getSafari8Dir = function (sdk, udid) {
  var appsDir = path.resolve(getSimDirs(sdk, udid)[0],
                             "Containers", "Data", "Application");
  var magicFile = ".com.apple.mobile_container_manager.metadata.plist";
  var cond = function (d) {
    var magicPlist = path.resolve(appsDir, d, magicFile);
    if (!fs.existsSync(magicPlist)) {
      return false;
    }
    var data = getPlistData(magicPlist);
    return data.MCMMetadataIdentifier === "com.apple.mobilesafari";
  };
  return findSafariByCondition(appsDir, cond);
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

settings.updateSettings = function (sdk, udid, forPlist, prefSet) {
  logger.debug("Updating settings for " + forPlist);
  checkValidSettings(forPlist, prefSet);
  var prefSetPerFile = {};
  var curSettings = settings.getSettings(sdk, udid, forPlist);
  _.each(curSettings, function (settingSet, file) {
    _.each(prefSet, function (prefValue, prefName) {
      settingSet[prefName] = prefValue;
    });
    prefSetPerFile[file] = settingSet;
  });
  settings.writeSettings(forPlist, prefSetPerFile, true);
};

settings.updateLocationSettings = function (sdk, udid, bundleId, authorized) {
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
  var curCacheSettings = settings.getSettings(sdk, udid, 'locationCache');
  _.each(curCacheSettings, function (settingSet, file) {
    cachePrefSetPerFile[file] = _.extend(_.clone(newCachePrefs), settingSet);
  });
  var curSettings = settings.getSettings(sdk, udid, 'locationClients');
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

settings.updateSafariSettings = function (sdk, udid, settingSet) {
  settings.updateSafariUserSettings(sdk, udid, settingSet);
  settings.updateSettings(sdk, udid, 'mobileSafari', settingSet);
};

settings.updateSafariUserSettings = function (sdk, udid, settingSet) {
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
    var curUserSettings = settings.getSettings(sdk, udid, 'userSettings');
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

settings.getSettings = function (sdk, udid, forPlist) {
  var files = getPlistPaths(forPlist, sdk, udid);
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

settings.simDirsExist = function (sdk, udid) {
  return getSimDirs(sdk, udid).length > 0;
};

settings.safariDirsExist = function (sdk, udid) {
  try {
    return getSafariDirs(sdk, udid).length > 0;
  } catch (e) {
    return false;
  }
};

settings.locServicesDirsExist = function (sdk, udid) {
  return getPlistPaths('locationClients', sdk, udid).length > 0;
};

module.exports = settings;
