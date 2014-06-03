// Gets adb from npm package and setup logger
"use strict";

var ADB = require('appium-adb');

ADB.logger.init(require('../../server/logger').get('appium'));

module.exports = ADB;

