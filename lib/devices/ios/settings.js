"use strict";

var logger = require('../../server/logger.js').get('appium')
  , _ = require('underscore')
  , fs = require('fs')
  , path = require('path')
  , bplistCreate = require('bplist-creator')
  , bplistParse = require('bplist-parser');

var settings = {};
var plists = {
  locationServices: 'com.apple.locationd.plist',
  webInspector: 'com.apple.webInspector.plist',
  mobileSafari: 'com.apple.mobilesafari.plist',
  webFoundation: 'com.apple.WebFoundation.plist',
  preferences: 'com.apple.Preferences.plist'
};

var prefs = {
  mobileSafari: {
    OpenLinksInBackground: [0, 1],
    WebKitJavaScriptCanOpenWindowsAutomatically: [true, false],
    SearchEngineStringSetting: ['Google', 'Yahoo!', 'Bing'],
    SafariDoNotTrackEnabled: [true, false],
    SuppressSearchSuggestions: [true, false],
    SpeculativeLoading: [true, false],
    WarnAboutFraudulentWebsite: [true, false],
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

var getPlistPath = function(plist, sdk) {
  var file = plists[plist];
  var base = getPrefsDir(sdk);
  if (plist === 'mobileSafari' && parseFloat(sdk) >= 7) {
    base = getSafari7Dir(sdk);
  }
  return path.resolve(base, file);
};

var getSimDir = function(sdk) {
  sdk = sdk.toString();
  var u = process.env.USER;
  return path.resolve("/Users", u, "Library", "Application Support",
      "iPhone Simulator", sdk);
};

var getPrefsDir = function(sdk) {
  return path.resolve(getSimDir(sdk), "Library", "Preferences");
};

var getSafari7Dir = function(sdk) {
  var appsDir = path.resolve(getSimDir(sdk), "Applications");
  var list;
  try {
    list = fs.readdirSync(appsDir);
  } catch (e) {
    if (/ENOENT/.test(e.message)) {
      throw new Error("Applications directory " + appsDir + " doesn't exist. " +
          "Have you run this simulator before?");
    }
    throw e;
  }
  var safariDir = null;
  for (var i = 0; i < list.length; i++) {
    if (fs.existsSync(path.resolve(appsDir, list[i], "MobileSafari.app"))) {
      safariDir = path.resolve(appsDir, list[i], "Library", "Preferences");
      break;
    }
  }
  if (safariDir) {
    return safariDir;
  }
  throw new Error("Could not find MobileSafari in sim applications");
};

var checkValidSettings = function(forPlist, prefSet) {
  var e = null;
  if (!_.has(plists, forPlist) || !_.has(prefs, forPlist)) {
    e = new Error("plist type " + forPlist + " doesn't exist");
  }

  _.each(prefSet, function(prefValue, prefName) {
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

settings.writeSettings = function(sdk, forPlist, prefSet, bypassCheck) {
  logger.info("Writing settings for " + forPlist + ":");
  logger.info(JSON.stringify(prefSet));
  if (!bypassCheck) {
    checkValidSettings(forPlist, prefSet);
  }
  prefSet = [prefSet];  // need to wrap in an array to get written correctly
  var plistPath = getPlistPath(forPlist, sdk);
  try {
    fs.unlinkSync(plistPath);
  } catch (e) {}
  fs.writeFileSync(plistPath, bplistCreate(prefSet));
};

settings.updateSettings = function(sdk, forPlist, prefSet) {
  logger.info("Updating settings for " + forPlist);
  checkValidSettings(forPlist, prefSet);
  try {
    var curSettings = settings.getSettings(sdk, forPlist);
    _.each(prefSet, function(prefValue, prefName) {
      curSettings[prefName] = prefValue;
    });
    prefSet = curSettings;
  } catch (e) {
    logger.info("Settings file didn't seem to exist");
  }
  settings.writeSettings(sdk, forPlist, prefSet, true);
};

settings.getSettings = function(sdk, forPlist) {
  logger.info("Getting current settings for " + forPlist);
  var file = getPlistPath(forPlist, sdk);
  if (fs.existsSync(file)) {
    var data = fs.readFileSync(file);
    return bplistParse.parseBuffer(data)[0];
  } else {
    throw new Error("Settings file " + file + " did not exist");
  }
};

module.exports = settings;
