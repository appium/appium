"use strict";
var desired = require('./desired');

describe("safari - webview", function () {
  require('../../../common/webview/implicit-wait-base')(desired);
});
