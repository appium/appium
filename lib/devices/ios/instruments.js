// Gets instrument from npm package and setup logger
"use strict";

var logger = require('appium-instruments').logger,
    Instruments = require('appium-instruments').Instruments;

logger.init(require('../../server/logger.js').get('appium'));

module.exports = Instruments;
