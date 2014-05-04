"use strict";

process.env.DEVICE = process.env.DEVICE || "android";
var androidWebviewTests = require('../../helpers/android-webview');

describe('android - web_view - contexts -', androidWebviewTests.contexts);

// TODO: remove in Appium 1.0
describe('android - web_view - windows -', androidWebviewTests.windows);
