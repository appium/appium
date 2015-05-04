"use strict";

var getAppPath = require('sample-apps');
var env = require('../../../helpers/env.js');

module.exports = {
  app: getAppPath('UICatalog', env.REAL_DEVICE)
};
