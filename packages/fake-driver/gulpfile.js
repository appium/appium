'use strict';

const gulp = require('gulp');
const boilerplate = require('appium-gulp-plugins').boilerplate.use(gulp);

boilerplate({
  build: '@appium/fake-driver',
  testTimeout: 15000,
  watchE2E: true,
});
