"use strict";

var gulp = require('gulp'),
    path = require('path'),
    mochaStream = require('spawn-mocha-parallel').mochaStream,
    jshint = require('gulp-jshint'),
    jshintStylish = require('jshint-stylish'),
    jscs = require('gulp-jscs'),
    Q = require('q'),
    runSequence = Q.denodeify(require('run-sequence'));

var mochaOpts = {
  flags: {
    u: 'bdd-with-opts',
    R: 'nyan'
  },
  bin: path.join(__dirname,  'node_modules/.bin/mocha'),
  concurrency: 5
};

var JS_SOURCES = ['*.js', 'bin/**/*.js', 'ci/**/*.js', 'new-ci/**/*.js', 'lib/**/*.js', 'test/**/*.js'];

gulp.task('jshint', function () {
  return gulp.src(JS_SOURCES)
    .pipe(jshint())
    .pipe(jshint.reporter(jshintStylish))
    .pipe(jshint.reporter('fail'));
});

gulp.task('jscs', function () {
  return gulp.src(JS_SOURCES)
    .pipe(jscs({configPath: __dirname + '/.jscsrc'}));
});

gulp.task('lint', ['jshint', 'jscs']);

gulp.task('test-unit', function () {
  var opts = mochaOpts;
  var mocha = mochaStream(opts);
  return gulp.src('test/unit/**/*-specs.js', {read: false})
    .pipe(mocha)
    .on('error',  console.warn.bind(console));
});

gulp.task('default', function () {
  return runSequence('lint', 'test-unit');
});
