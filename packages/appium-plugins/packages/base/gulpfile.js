/* eslint no-console:0 */
/* eslint-disable promise/prefer-await-to-callbacks */
'use strict';

const gulp = require('gulp');
const boilerplate = require('appium-gulp-plugins').boilerplate.use(gulp);

boilerplate({
  build: 'appium-base-plugin',
  projectRoot: __dirname,
  files: [
    '*.js',
    'lib/**/*.js',
    'test/**/*.js',
    '!gulpfile.js',
  ],
  test: {
    files: ['${testDir}/**/*-specs.js']
  },
  testTimeout: 160000,
  preCommitTasks: ['eslint', 'once'],
});
