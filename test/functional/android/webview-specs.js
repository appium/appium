"use strict";

var androidWebviewTests = require('../common/android-webview-base');

// TODO: androidWebviewTests is using an app built by selendroid. Need to build it once
// and save it into asset so that it can be used by android tests
// TODO: when I run it on android I don't see the WEBVIEW context, this needs
// to be investigated
describe('android - web_view @skip-ci @skip-android-all', androidWebviewTests);
