"use strict";
var desired = require('./desired');

describe("safari - webview @skip-ios6 @skip-real-device", function () {
  require('../../../common/webview/alerts-base')(desired);
});
