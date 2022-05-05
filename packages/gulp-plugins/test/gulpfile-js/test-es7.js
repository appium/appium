'use strict';

const gulp = require('gulp');
const mocha = require('gulp-mocha');
const {isVerbose, spawnWatcher} = require('../..');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');

gulp.task('test-es7-mocha:run', function () {
  return gulp
    .src('build-fixtures/test/a-specs.js')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});

gulp.task(
  'test-es7-mocha',
  gulp.series('transpile-es7-fixtures', 'test-es7-mocha:run')
);

gulp.task('test-es7-mocha-throw:run', function () {
  return gulp
    .src('build-fixtures/test/a-throw-specs.js')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(mocha())
    .on('error', spawnWatcher.handleError);
});

gulp.task(
  'test-es7-mocha-throw',
  gulp.series('transpile-es7-fixtures', 'test-es7-mocha-throw:run')
);
