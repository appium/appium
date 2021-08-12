'use strict';

const gulp = require('gulp');
const boilerplate = require('@appium/gulp-plugins').boilerplate.use(gulp);
const DEFAULTS = require('@appium/gulp-plugins').boilerplate.DEFAULTS;

gulp.task('copy-files', () =>
  gulp.src('./test/fixtures/*').pipe(gulp.dest('./build/test/fixtures')),
);

boilerplate({
  build: 'appium-doctor',
  files: [...DEFAULTS.files, 'bin/**/*.js'],
  postTranspile: ['copy-files'],
});
