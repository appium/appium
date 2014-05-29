"use strict";
var desired = require('./desired');

describe("chrome @android-arm-only", function () {
  require('../../common/webview/implicit-wait-base')(desired);
});
