"use strict";

var gulp = require('gulp'),
    boilerplate = require('appium-gulp-plugins').boilerplate.use(gulp),
    DEFAULTS = require('appium-gulp-plugins').boilerplate.DEFAULTS,
    _ = require('lodash');

boilerplate({
  build: 'appium-base-driver',
  jscs: false,
  testReporter: process.env.TRAVIS ? 'spec' : 'nyan',
  coverage: _.defaults({verbose: true}, DEFAULTS.coverage)
});
