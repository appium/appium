'use strict';

const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const { isVerbose } = require('../utils');
const yamlLint = require('../yaml-lint');


const configure = function configure (gulp, opts) {
  const verbose = isVerbose();

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
