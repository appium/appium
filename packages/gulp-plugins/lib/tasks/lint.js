'use strict';

const eslint = require('gulp-eslint');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const { isVerbose } = require('../utils');
const yamlLint = require('../yaml-lint');


const configure = function configure (gulp, opts) {
  const verbose = isVerbose();

  gulp.task('eslint', function eslintTask () {
    let opts = {
      fix: process.argv.includes('--fix'),
    };
    if (process.argv.includes('--lax-lint') || process.argv.includes('-ll')) {
      // when running tests, we want to be able to use exclusive tests
      // and console logging
      opts.rules = {
        'no-console': 0,
        'mocha/no-exclusive-tests': 0,
      };
    }
    return gulp
      .src(['**/*.js', '!node_modules/**', '!**/node_modules/**', '!build/**'])
      .pipe(gulpIf(verbose, debug()))
      .pipe(eslint(opts))
      .pipe(eslint.format())
      .pipe(eslint.failAfterError())
      .pipe(gulpIf((file) => file.eslint && file.eslint.fixed, gulp.dest(process.cwd())));
  });

  gulp.task('yamllint', function yamllintTask () {
    const yamlOpts = {
      safe: !!opts.yaml.safe,
    };
    return gulp
      .src(opts.yaml.files)
      .pipe(gulpIf(verbose, debug()))
      .pipe(yamlLint(yamlOpts));
  });

  const lintTasks = [];
  if (opts.eslint) {
    lintTasks.push('eslint');
  }
  if (opts.yamllint) {
    lintTasks.push('yamllint');
  }
  if (lintTasks.length) {
    gulp.task('lint', gulp.series(lintTasks));
  }
};

module.exports = {
  configure,
};
