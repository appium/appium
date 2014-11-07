"use strict";

var getAppPath = require('../../helpers/app').getAppPath,
    env = require('../../helpers/env'),
    _ = require("underscore");


var baseDesired = {
  platformName: 'iOS',
  platformVersion: env.CAPS.platformVersion || '7.1',
  deviceName: 'iPhone Simulator'
};

module.exports.testApp = _.defaults({
  app: getAppPath('TestApp'),
}, baseDesired);

module.exports.uicatalog = _.defaults({
  app: getAppPath('UICatalog')
}, baseDesired);

module.exports.uicatalog61 = _.defaults({
  app: 'assets/UICatalog6.1.app.zip',
  platformVersion: '6.1'
}, baseDesired);

module.exports.settings = _.defaults({
  app: 'settings'
}, baseDesired);

module.exports.safari = _.defaults({
  browserName: 'safari'
}, baseDesired);

module.exports.webview = _.defaults({
  app: env.IOS6 ? "assets/WebViewApp6.1.app.zip" : getAppPath('WebViewApp')
}, baseDesired);
