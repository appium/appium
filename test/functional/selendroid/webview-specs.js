"use strict";

process.env.DEVICE = process.env.DEVICE || "selendroid";
var androidWebviewTests = require('../../helpers/android-webview');
// if it doesn't work run: adb uninstall io.selendroid.testapp

describe('selendroid - web_view -', androidWebviewTests);
