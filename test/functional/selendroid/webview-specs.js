"use strict";

process.env.DEVICE = process.env.DEVICE || "selendroid";
var androidWebviewTests = require('../common/android-webview-base');
// if it doesn't work run: adb uninstall io.selendroid.testapp

describe('selendroid - web_view -', androidWebviewTests);
