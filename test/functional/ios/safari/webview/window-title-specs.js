"use strict";
var desired = require('./desired');

describe("safari - webview @skip-ios6", function () {
  require('../../../common/webview/window-title-base')(desired);
});
