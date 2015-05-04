"use strict";

var getAppPath = require('sample-apps');
var env = require('../../../helpers/env.js');

module.exports = {
  app: getAppPath('TestApp', env.REAL_DEVICE)
};
