"use strict";

var getAppPath = require('sample-apps');
var env = require('../../../helpers/env.js');

module.exports = {
  app: getAppPath('TestApp', env.REAL_DEVICE)
};

module.exports = {
  app: env.IOS6 ? "assets/WebViewApp6.1.app.zip" :
                 getAppPath('WebViewApp', env.REAL_DEVICE)
};
