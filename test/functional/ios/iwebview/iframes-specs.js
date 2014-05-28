"use strict";
var desired = require('./desired');

describe("iwebview @skip-ios-all", function () {
  require('../../common/webview/iframes-base')(desired);
});
