"use strict";

var env = require('../../../helpers/env')
  , getAppPath = require('../../../helpers/app').getAppPath;

module.exports = {
  app: env.IOS6 ? "assets/WebViewApp6.1.app.zip" : getAppPath('WebViewApp')
};
