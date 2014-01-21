"use strict";

var setup = require("../common/setup-base"),
    app = 'WebViewApp';

app = '/Users/sebv/Documents/Work/appium/assets/WebViewApp6.1.app.zip';
module.exports = function(context, desired) {
  if (!desired) desired = {app: app};
  return setup(context, desired);
};
