'use strict';

const gulp = require('gulp');
const {Transpiler, isVerbose, spawnWatcher} = require('../..');
const vinylPaths = require('vinyl-paths');
const del = require('del');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');

gulp.task('clean-fixtures', function () {
  return gulp
    .src('build-fixtures', {read: false, allowEmpty: true})
    .pipe(vinylPaths(del));
});

gulp.task('transpile-es7-fixtures', function () {
  let transpiler = new Transpiler();
  return gulp
    .src('test/fixtures/es7/**/*.js')
    .pipe(gulpIf(isVerbose(), debug()))
    .pipe(transpiler.stream())
    .on('error', spawnWatcher.handleError)
    .pipe(gulp.dest('build-fixtures'));
});

gulp.task(
  'transpile-fixtures',
  gulp.series('clean-fixtures', 'transpile-es7-fixtures')
);

require('./test-es7');
require('./generate');
