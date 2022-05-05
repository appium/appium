'use strict';

const mocha = require('gulp-mocha');
const B = require('bluebird');
const globby = require('globby');
const debug = require('gulp-debug');
const gulpIf = require('gulp-if');
const log = require('fancy-log');
const utils = require('../utils');

const {isVerbose} = utils;

const configure = function configure(gulp, opts, env) {
  const e2eTestFiles = utils.translatePaths(
    [opts.e2eTest.files || opts.e2eTestFiles],
    env.fileAliases
  );
  gulp.task('e2e-test:run', async function e2eTestRun() {
    const mochaOpts = {
      reporter: utils.getTestReporter(opts),
      timeout: opts.testTimeout,
      require: opts.testRequire || [],
      exit: true,
      color: true,
      traceWarnings: opts.e2eTest.traceWarnings,
      traceDeprecation: opts.e2eTest.traceWarnings,
    };
    // set env so our code knows when it's being run in a test env
    process.env._TESTING = 1;

    const mochaCmd = function () {
      return new B(function runCmd(resolve, reject) {
        gulp
          .src(e2eTestFiles, {read: true, allowEmpty: true})
          .pipe(gulpIf(isVerbose(), debug()))
          .pipe(mocha(mochaOpts))
          .on('error', function onError(err) {
            reject(err);
          })
          .once('_result', function onResult(...args) {
            resolve(...args);
          });
      });
    };

    try {
      const files = await globby(e2eTestFiles);
      // gulp-mocha has an issue where, if there are no files passed from gulp.src,
      // it will just run everything it finds
      if (!files.length) {
        log(`No e2e test files found using '${e2eTestFiles}'`);
        return;
      }
      await mochaCmd();
    } finally {
      if (opts.e2eTest.forceExit) {
        process.exit(0);
      }
    }
  });
  gulp.task('e2e-test', gulp.series(env.testDeps, 'e2e-test:run'));
};

module.exports = {
  configure,
};
