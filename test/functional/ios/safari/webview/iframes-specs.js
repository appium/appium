"use strict";
var desired = require('./desired');

describe("safari - webview", function () {
  require('../../../common/webview/iframes-base')(desired);
});
