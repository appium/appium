"use strict";

var textFieldTests = require('../../../common/android-keyboard-base').textFieldTests;

describe('android - keyboard', function () {
  // TODO: inputing &- doesn't work on the Linux VMs with api 18
  var exclude = process.env.APPIUM_CI ? ['&-'] : undefined;

  textFieldTests(exclude);
});
