"use strict";
var desired = require('./desired');

describe("chrome @android-arm-only", function () {
  require('../../common/webview/execute-async-base')(desired);
});
