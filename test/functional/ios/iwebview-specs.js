"use strict";

describe('iwebview @skip-ios-all @skip-ci', function () {
  // TODO: webview tests need to be refactored before ci is enabled
  var app = 'iwebview';
  require('../common/webview-base')(app);
});
