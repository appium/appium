"use strict";

var fs = require('fs')
  , XMLDom = require('xmldom')
  , xpath = require('xpath')
  , logger = require('../../server/logger.js').get('appium');

var MockAppModel = function () {
  this.dom = null;
};

MockAppModel.prototype.loadApp = function (appPath, cb) {
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

MockAppModel.prototype.getWebviews = function () {
  var nodes = xpath.select('//MockWebView', this.dom);
  return nodes;
};

module.exports = MockAppModel;
