"use strict";

var _ = require('underscore');

var FakeElement = function (xmlNode) {
  this.node = xmlNode;
  this.nodeAttrs = {};
  this.type = this.node.tagName;
  this.attrs = {};
  _.each(this.node.attributes, function (attrSet) {
    this.nodeAttrs[attrSet.name] = attrSet.value;
  }.bind(this));
};

FakeElement.prototype.setAttr = function (k, v) {
  this.attrs[k] = v;
};

FakeElement.prototype.getAttr = function (k) {
  return this.attrs[k] || "";
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

module.exports = FakeElement;
