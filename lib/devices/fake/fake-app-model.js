"use strict";

var fs = require('fs')
  , XMLDom = require('xmldom')
  , xpath = require('xpath')
  , logger = require('../../server/logger.js').get('appium');

var FakeAppModel = function () {
  this.dom = null;
};

FakeAppModel.prototype.loadApp = function (appPath, cb) {
  logger.debug("Loading Mock app model");
  fs.readFile(appPath, function (err, data) {
    if (err) return cb(err);
    try {
      logger.debug("Parsing Mock app XML");
      this.dom = new XMLDom.DOMParser().parseFromString(data.toString());
    } catch (e) {
      return cb(e);
    }
    cb();
  }.bind(this));
};

FakeAppModel.prototype.getWebviews = function () {
  return this.xpathQuery('//MockWebView');
};

FakeAppModel.prototype.xpathQuery = function (sel) {
  return xpath.select(sel, this.dom);
};

module.exports = FakeAppModel;
