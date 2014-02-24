"use strict";

process.env.DEVICE = process.env.DEVICE || "android";
var androidWebviewTests = require('../../helpers/android-webview');

describe('android - web_view -', androidWebviewTests);
