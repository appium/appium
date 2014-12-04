"use strict";

var fs = require('fs')
  , _ = require('underscore')
  , XMLDom = require('xmldom')
  , xpath = require('xpath')
  , FakeElement = require('./fake-element')
  , logger = require('../../server/logger.js').get('appium');

var FakeAppModel = function () {
  this.dom = null;
  this.activeDom = null;
  this.activeWebview = null;
  this.activeFrame = null;
  this.activeAlert = null;
  this.lat = 0;
  this.long = 0;
  this.rawXml = '';
};

FakeAppModel.prototype.loadApp = function (appPath, cb) {
  logger.debug("Loading Mock app model");
  fs.readFile(appPath, function (err, data) {
    if (err) return cb(err);
    try {
      logger.debug("Parsing Mock app XML");
      this.rawXml = data.toString();
      this.dom = new XMLDom.DOMParser().parseFromString(this.rawXml);
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
  this.activeDom = new XMLDom.DOMParser().parseFromString(fragment,
      "application/xml");
};

FakeAppModel.prototype.activateFrame = function (frame) {
  this.activeFrame = frame;
  var fragment = new XMLDom.XMLSerializer().serializeToString(frame);
  this.activeDom = new XMLDom.DOMParser().parseFromString(fragment,
      "application/xml");
};

FakeAppModel.prototype.deactivateWebview = function () {
  this.activeWebview = null;
  this.activeDom = this.dom;
};

FakeAppModel.prototype.deactivateFrame = function () {
  this.activeFrame = null;
  this.activateWebview(this.activeWebview);
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

FakeAppModel.prototype.title = function () {
  var nodes = this.xpathQuery('//title');
  if (nodes.length < 1) {
    throw new Error("No title!");
  }
  return nodes[0].firstChild.data;
};

FakeAppModel.prototype.showAlert = function (alertId) {
  var nodes = this.xpathQuery('//alert[@id="' + alertId + '"]');
  if (nodes.length < 1) {
    throw new Error("Alert " + alertId + " doesn't exist!");
  }
  this.activeAlert = new FakeElement(nodes[0], this);
};

FakeAppModel.prototype.hasAlert = function () {
  return this.activeAlert !== null;
};

FakeAppModel.prototype.alertText = function () {
  return this.activeAlert.getAttr('prompt') || this.activeAlert.nodeAttrs.text;
};

FakeAppModel.prototype.setAlertText = function (text) {
  if (!this.activeAlert.hasPrompt()) {
    throw new Error("No prompt to set text of");
  }
  this.activeAlert.setAttr('prompt', text);
};

FakeAppModel.prototype.handleAlert = function () {
  this.activeAlert = null;
};

var FakeWebView = function (node) {
  this.node = node;
};

module.exports = FakeAppModel;
