'use strict';

const Transpiler = require('../../index').Transpiler;
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const merge = require('merge-stream');
const { isVerbose } = require('../utils');

const JSON_SOURCES = [
  'lib/**/*.json',
  'test/**/*.json',
];

const configure = function configure (gulp, opts, env) {
  gulp.task('transpile', function () {
    // json files can be copied as is, they don't need to be transpiled
    const firstPath = gulp.src(JSON_SOURCES, {base: './'})
      .pipe(gulp.dest(opts.transpileOut));
    const secondPath = gulp.src(opts.files, {base: './'})
      .pipe(gulpIf(isVerbose(), debug()))
      .pipe(new Transpiler(opts).stream())
      .on('error', env.spawnWatcher.handleError.bind(env.spawnWatcher))
      .pipe(gulp.dest(opts.transpileOut));
    return merge(firstPath, secondPath);
  });
};

module.exports = {
  configure,
};
