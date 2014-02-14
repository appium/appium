"use strict";

var getAppPath = require('../../../helpers/app').getAppPath;

module.exports = {
  app: getAppPath('ApiDemos', 'android'),
  device: 'Android',
  'app-package': 'com.example.android.apis',
  'app-activity': '.ApiDemos'
};
