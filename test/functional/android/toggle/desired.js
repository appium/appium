"use strict";

var getAppPath = require('../../../helpers/app').getAppPath;

module.exports = {
  app: getAppPath('ToggleTest'),
  appPackage: 'com.example.toggletest',
  appActivity: '.MainActivity',
  newCommandTimeout: 90
};
