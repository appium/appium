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
  webinspectord: 'com.apple.webinspectord.plist'
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
  webinspectord: {
    RemoteInspectorEnabled: [true, false]
  }
};

var getPlistPath = function(plist) {
  var file = plists[plist];
  var fullPath = '';
  if (plist === 'mobileSafari') {
  } else {
    fullPath = path.resolve("", file);
  }
  return fullPath;
};

settings.writeSettings = function(forPlist, prefSet, cb) {
  var e;
  logger.info("Writing settings for " + forPlist);
  if (!_.has(plists, forPlist) || !_.has(prefs, forPlist)) {
    e = new Error("plist type " + forPlist + " doesn't exist");
    logger.error(e.message);
    return cb(e);
  }
  var returned = false;
  _.each(prefSet, function(prefValue, prefName) {
    if (!returned && !_.has(prefs[forPlist], prefName)) {
      returned = true;
      e = new Error("plist type " + forPlist + " has no option " +
                        prefName);
      logger.error(e.message);
      return cb(e);
    }
    if (!returned && !_.contains(prefs[forPlist][prefName], prefValue)) {
      returned = true;
      e = new Error("plist type " + forPlist + ", option " + prefName +
                        " has no possible value " + prefValue);
      logger.error(e.message);
      return cb(e);
    }
  });

  var plistPath = getPlistPath(forPlist);
  fs.unlink(plistPath, function(err) {
    console.log(err);
    fs.writeFile(getPlistPath(forPlist), bplistCreate(prefSet), cb);
  });
};


module.exports = settings;
