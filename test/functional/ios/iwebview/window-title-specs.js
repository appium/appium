"use strict";
var desired = require('./desired');

describe("iwebview @skip-ios-all", function () {
  require('../../common/webview/window-title-base')(desired);
});
