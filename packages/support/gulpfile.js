'use strict';

const gulp = require('gulp');
const boilerplate = require('@appium/gulp-plugins').boilerplate.use(gulp);

boilerplate({
  build: 'appium-support',
  coverage: {
    files: [
      './build/test/**/*-specs.js',
      '!./build/test/assets/**',
      '!./build/test/images/**',
      '!./build/test/**/*-e2e-specs.js'
    ],
    verbose: true,
  },
});
