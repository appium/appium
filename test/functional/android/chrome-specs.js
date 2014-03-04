"use strict";

process.env.DEVICE = process.env.DEVICE || "android";
describe("chrome", function () {
  require('../common/webview-base')('chromium');
});
