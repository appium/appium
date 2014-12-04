"use strict";

var _ = require('underscore');

var FakeElement = function (xmlNode, app) {
  this.app = app;
  this.node = xmlNode;
  this.nodeAttrs = {};
  this.type = this.node.tagName;
  this.attrs = {};
  _.each(this.node.attributes, function (attrSet) {
    this.nodeAttrs[attrSet.name] = attrSet.value;
  }.bind(this));
};

FakeElement.prototype.click = function () {
  var curClicks = this.getAttr('clicks') || 0;
  this.setAttr('clicks', curClicks + 1);
  var alertId = this.nodeAttrs.showAlert;
  if (alertId) {
    this.app.showAlert(alertId);
  }
};

FakeElement.prototype.setAttr = function (k, v) {
  this.attrs[k] = v;
};

FakeElement.prototype.getAttr = function (k) {
  return this.attrs[k] || "";
};

FakeElement.prototype.getLocation = function () {
  return {
    x: parseFloat(this.nodeAttrs.left || 0),
    y: parseFloat(this.nodeAttrs.top || 0)
  };
};

FakeElement.prototype.getSize = function () {
  return {
    width: parseFloat(this.nodeAttrs.width || 0),
    height: parseFloat(this.nodeAttrs.height || 0)
  };
};

FakeElement.prototype.isVisible = function () {
  return this.nodeAttrs.visible !== "false";
};

FakeElement.prototype.isEnabled = function () {
  return this.nodeAttrs.enabled !== "false";
};

FakeElement.prototype.isSelected = function () {
  return this.nodeAttrs.selected === "true";
};

FakeElement.prototype.hasPrompt = function () {
  return this.nodeAttrs.hasPrompt === "true";
};

FakeElement.prototype.tagName = function () {
  return this.node.tagName;
};

FakeElement.prototype.equals = function (other) {
  return this.node === other.node;
};

module.exports = FakeElement;
