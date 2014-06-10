"use strict";

var androidWebviewTests = require('../common/android-webview-base');
// if it doesn't work run: adb uninstall io.selendroid.testapp

// TODO: not working on Sauce because of context issues
describe('webview @skip-ci', androidWebviewTests);
