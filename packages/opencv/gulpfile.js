'use strict';

const gulp = require('gulp');
const boilerplate = require('@appium/gulp-plugins').boilerplate.use(gulp);

boilerplate({
  build: '@appium/opencv',
  coverage: {
    files: [
      './build/test/**/*-specs.js',
      '!./build/test/images/**',
      '!./build/test/**/*-e2e-specs.js'
    ],
    verbose: true,
  }
});
