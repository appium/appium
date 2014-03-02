"use strict";

var logger = require('appium-uiautomator').logger,
    UiAutomator = require('appium-uiautomator').UiAutomator;

logger.init(require('../../server/logger.js').get('appium'));

module.exports = UiAutomator;
