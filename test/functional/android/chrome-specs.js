"use strict";

process.env.DEVICE = process.env.DEVICE || "android";
describe("chrome - @android-arm-only -", function () {
  require('../common/webview-base')('chromium');
});
