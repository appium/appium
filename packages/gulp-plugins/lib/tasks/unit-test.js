'use strict';

const mocha = require('gulp-mocha');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const utils = require('../utils');


const configure = function configure (gulp, opts, env) {
  const testFiles = utils.translatePaths([opts.test.files || opts.testFiles], env.fileAliases);
  gulp.task('unit-test:run', function unitTestRun () {
    const mochaOpts = {
      reporter: utils.getTestReporter(opts),
      timeout: opts.testTimeout,
      traceWarnings: opts.test.traceWarnings,
      traceDeprecation: opts.test.traceWarnings,
      color: true,
      exit: Boolean(opts.test.exit)
    };
    // set env so our code knows when it's being run in a test env
    process.env._TESTING = 1;
    return gulp
      .src(testFiles, {read: false})
      .pipe(gulpIf(utils.isVerbose(), debug()))
      .pipe(mocha(mochaOpts))
      .once('error', env.spawnWatcher.handleError.bind(env.spawnWatcher));
  });
  gulp.task('unit-test', gulp.series(env.testDeps, 'unit-test:run'));
};

module.exports = {
  configure,
};
