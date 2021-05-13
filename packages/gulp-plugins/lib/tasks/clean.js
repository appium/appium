'use strict';

const B = require('bluebird');
const vinylPaths = require('vinyl-paths');
const del = require('del');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const { isVerbose } = require('../utils');


const configure = function configure (gulp, opts) {
  gulp.task('clean', function clean () {
    if (opts.transpile) {
      return gulp
        .src(opts.transpileOut, {
          read: false,
          allowEmpty: true,
        })
        .pipe(gulpIf(isVerbose(), debug()))
        .pipe(vinylPaths(del));
    } else {
      return B.resolve();
    }
  });
};

module.exports = {
  configure,
};
