"use strict";

var logger = require('appium-adb').logger,
    ADB = require('appium-adb').ADB;

logger.init(require('../../server/logger.js').get('appium'));

module.exports = ADB;

