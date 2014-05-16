"use strict";

var androidWebviewTests = require('../common/android-webview-base');

// TODO: androidWebviewTests is using an app built by selendroid. Need to build it once
// and save it into asset so that it can be used by android tests
describe('android - web_view @skip-ci', androidWebviewTests);
