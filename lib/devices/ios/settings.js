"use strict";

var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , fs = require('fs')
  , path = require('path')
  , bplistCreate = require('bplist-creator')
  , mkdirp = require('mkdirp')
  , Simulator = require('./simulator.js')
  , multiResolve = require('../../helpers.js').multiResolve;

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
    'LocationServicesEnabledIn8.0': [0, 1],
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

var getPlistPaths = function (plist, sim) {
  var files;
  var file = plists[plist];
  var bases = getPrefsDirs(sim);
  if (plist === 'mobileSafari' && parseFloat(sim.platformVer) >= 7) {
    bases = multiResolve(sim.getSafariDirs(), "Library", "Preferences");
  } else if (plist === 'locationClients') {
    bases = multiResolve(sim.getDirs(), "Library", "Caches", "locationd");
  } else if (plist === 'locationCache') {
    var bases2 = multiResolve(sim.getDirs(), "Library", "Caches", "locationd");
    files = multiResolve(bases, file);
    files = files.concat(multiResolve(bases2, file));
    return files;
  } else if (plist === 'userSettings') {
    files = multiResolve(sim.getDirs(), "Library", "ConfigurationProfiles",
                         file);
    files = files.concat(multiResolve(sim.getDirs(), "Library",
                         "ConfigurationProfiles", "PublicInfo",
                         "EffectiveUserSettings.plist"));
    files = files.concat(multiResolve(sim.getDirs(), "Library",
                         "ConfigurationProfiles", "PublicInfo",
                         "PublicEffectiveUserSettings.plist"));
    return files;
  }

  return multiResolve(bases, file);
};

var getPrefsDirs = function (sim) {
  return multiResolve(sim.getDirs(), "Library", "Preferences");
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

settings.updateSettings = function (sim, forPlist, prefSet) {
  logger.debug("Updating settings for " + forPlist);
  checkValidSettings(forPlist, prefSet);
  var prefSetPerFile = {};
  var curSettings = settings.getSettings(sim, forPlist);
  _.each(curSettings, function (settingSet, file) {
    _.each(prefSet, function (prefValue, prefName) {
      settingSet[prefName] = prefValue;
    });
    prefSetPerFile[file] = settingSet;
  });
  settings.writeSettings(forPlist, prefSetPerFile, true);
};

settings.updateLocationSettings = function (sim, bundleId, authorized) {
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
  var curCacheSettings = settings.getSettings(sim, 'locationCache');
  _.each(curCacheSettings, function (settingSet, file) {
    cachePrefSetPerFile[file] = _.extend(_.clone(newCachePrefs), settingSet);
  });
  var curSettings = settings.getSettings(sim, 'locationClients');
  _.each(curSettings, function (settingSet, file) {
    // 8.1 changed the format a bit.
    if (sim.sdkVer === "8.1" || sim.sdkVer === "8.2") {
      logger.debug("Using 8.X format locationd plist format.");
      _.extend(newPrefs,  {
        Authorization: 2,
        SupportedAuthorizationMask: 3,
      });
      // now add our app's data
      if (!_.has(settingSet, bundleId)) {
        settingSet[bundleId] = {};
      }
      _.extend(settingSet[bundleId], newPrefs);
      if (!_.has(settingSet[bundleId], 'Executable')) {
        settingSet[bundleId].Executable = "";
      }
      if (!_.has(settingSet[bundleId], 'Registered')) {
        settingSet[bundleId].Registered = "";
      }
    }  else {
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
    }
    prefSetPerFile[file] = settingSet;
  });
  settings.writeSettings('locationClients', prefSetPerFile, true);
  settings.writeSettings('locationCache', cachePrefSetPerFile, true);
};

settings.updateSafariSettings = function (sim, settingSet) {
  settings.updateSafariUserSettings(sim, settingSet);
  settings.updateSettings(sim, 'mobileSafari', settingSet);
};

settings.updateSafariUserSettings = function (sim, settingSet) {
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
    var curUserSettings = settings.getSettings(sim, 'userSettings');
    _.each(curUserSettings, function (settingSet, file) {
      _.extend(settingSet.restrictedBool, newUserSettings);
      userSettingsPerFile[file] = settingSet;
    });
    settings.writeSettings('userSettings', userSettingsPerFile, true);
  }
};

settings.getSettings = function (sim, forPlist) {
  var files = getPlistPaths(forPlist, sim);
  var bplists = {};
  _.each(files, function (file) {
    logger.debug("Getting current settings for " + forPlist + " from " + file);
    try {
      bplists[file] = Simulator.getPlistData(file);
    } catch (err) {
      bplists[file] = {};
      logger.warn(err.message);
    }
  });
  return bplists;
};

settings.locServicesDirsExist = function (sim) {
  return getPlistPaths('locationClients', sim).length > 0;
};

module.exports = settings;
