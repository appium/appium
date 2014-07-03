/*
  The appium specific methods are not yet implemented by selenium-webdriver,
  and therefore not available in Protractor. However it is possible to attach
  an existing Protractor session to a wd browser instance as below.

  prerequisites:
    npm install protractor
    npm install -g protractor
*/

"use strict";

var wd = require('wd'),
    wdBridge = require('wd-bridge')(require('protractor'), wd),
    _ = require('underscore');

// An example configuration file.
var config = {
  seleniumAddress: 'http://localhost:4723/wd/hub',

  // Capabilities to be passed to the webdriver instance.
  capabilities: _({}).chain()
    .extend(require("../helpers/caps").ios71)
    .extend({'browserName': 'safari'})
    .omit('app').value(),
  // Spec patterns are relative to the current working directly when
  // protractor is called.
  specs: ['example_spec.js'],

  // Options to be passed to Jasmine-node.
  jasmineNodeOpts: {
    showColors: true,
    defaultTimeoutInterval: 30000
  },

  // configuring wd in onPrepare
  onPrepare: function () {
    wdBridge.initFromProtractor(config);
  }

};

exports.config = config;