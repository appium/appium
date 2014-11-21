"use strict";

var fs = require('fs')
  , _ = require('underscore')
  , XMLDom = require('xmldom')
  , xpath = require('xpath')
  , logger = require('../../server/logger.js').get('appium');

var FakeAppModel = function () {
  this.dom = null;
  this.activeDom = null;
  this.activeWebview = null;
};

FakeAppModel.prototype.loadApp = function (appPath, cb) {
  logger.debug("Loading Mock app model");
  fs.readFile(appPath, function (err, data) {
    if (err) return cb(err);
    try {
      logger.debug("Parsing Mock app XML");
      this.dom = new XMLDom.DOMParser().parseFromString(data.toString());
      this.activeDom = this.dom;
    } catch (e) {
      return cb(e);
    }
    cb();
  }.bind(this));
};

FakeAppModel.prototype.getWebviews = function () {
  return _.map(this.xpathQuery('//MockWebView/*[1]'), function (n) {
    return new FakeWebView(n);
  });
};

FakeAppModel.prototype.activateWebview = function (wv) {
  this.activeWebview = wv;
  var fragment = new XMLDom.XMLSerializer().serializeToString(wv.node);
  console.log(fragment);
  this.activeDom = new XMLDom.DOMParser().parseFromString(fragment,
      "application/xml");
  console.log(this.activeDom);
};

FakeAppModel.prototype.deactivateWebview = function () {
  this.activeWebview = null;
  this.activeDom = this.dom;
};

FakeAppModel.prototype.xpathQuery = function (sel) {
  return xpath.select(sel, this.activeDom);
};

FakeAppModel.prototype.idQuery = function (id) {
  return this.xpathQuery('//*[@id="' + id + '"]');
};

FakeAppModel.prototype.classQuery = function (className) {
  return this.xpathQuery('//' + className);
};

var FakeWebView = function (node) {
  this.node = node;
};

module.exports = FakeAppModel;
