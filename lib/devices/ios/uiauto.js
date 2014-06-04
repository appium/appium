// Gets instrument from npm package and setup logger
"use strict";

var uiauto = require('appium-uiauto'),
    logger = uiauto.logger;

logger.init(require('../../server/logger.js').get('appium'));

module.exports = uiauto;
