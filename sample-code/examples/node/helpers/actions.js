"use strict";

var wd = require('wd'),
    Q = require('q');

exports.swipe = function (opts) {
  var action = new wd.TouchAction();
  action
    .press({x: opts.startX, y: opts.startY})
    .wait(opts.duration)
    .moveTo({x: opts.endX, y: opts.endY})
    .release();
  return this.performTouchAction(action);
};

exports.pinch = function (el) {
  return Q.all([
    el.getSize(),
    el.getLocation(),
  ]).then(function (res) {
    var size = res[0];
    var loc = res[1];
    var center = {
      x: loc.x + size.width / 2,
      y: loc.y + size.height / 2
    };
    var a1 = new wd.TouchAction(this);
    a1.press({el: el, x: center.x, y: center.y - 100}).moveTo({el: el}).release();
    var a2 = new wd.TouchAction(this);
    a2.press({el: el, x: center.x, y: center.y + 100}).moveTo({el: el}).release();
    var m = new wd.MultiAction(this);
    m.add(a1, a2);
    return m.perform();
  }.bind(this));
};

exports.zoom = function (el) {
  return Q.all([
    this.getWindowSize(),
    this.getLocation(el),
  ]).then(function (res) {
    var size = res[0];
    var loc = res[1];
    var center = {
      x: loc.x + size.width / 2,
      y: loc.y + size.height / 2
    };
    var a1 = new wd.TouchAction(this);
    a1.press({el: el}).moveTo({el: el, x: center.x, y: center.y - 100}).release();
    var a2 = new wd.TouchAction(this);
    a2.press({el: el}).moveTo({el: el, x: center.x, y: center.y + 100}).release();
    var m = new wd.MultiAction(this);
    m.add(a1, a2);
    return m.perform();
  }.bind(this));
};
