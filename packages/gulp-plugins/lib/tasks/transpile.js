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

/**
 * @param {import('gulp').Gulp} gulp - The gulp instance.
 */
const configure = function configure (gulp, opts, env) {
  const tasks = [
    function transpileSources () {
      // json files can be copied as is, they don't need to be transpiled
      const firstPath = gulp.src(JSON_SOURCES, {base: './'})
        .pipe(gulp.dest(opts.transpileOut));
      const secondPath = gulp.src(opts.files, {base: './'})
        .pipe(gulpIf(isVerbose(), debug()))
        .pipe(new Transpiler(opts).stream())
        .on('error', env.spawnWatcher.handleError.bind(env.spawnWatcher))
        .pipe(gulp.dest(opts.transpileOut));
      return merge(firstPath, secondPath);
    }
  ];

  if (opts.postTranspile && opts.postTranspile.length) {
    gulp.task('post-transpile', gulp.parallel(opts.postTranspile));
    tasks.push('post-transpile');
  }

  gulp.task('transpile', gulp.series(tasks));
};

module.exports = {
  configure,
};
