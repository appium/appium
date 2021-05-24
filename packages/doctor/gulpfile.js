'use strict';

const gulp = require('gulp');
const boilerplate = require('@appium/gulp-plugins').boilerplate.use(gulp);
const DEFAULTS = require('@appium/gulp-plugins').boilerplate.DEFAULTS;

boilerplate({
  build: 'appium-doctor',
  files: DEFAULTS.files.concat('bin/**/*.js'),
});
