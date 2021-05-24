'use strict';

const e2eTest = require('./e2e-test');
const unitTest = require('./unit-test');


const configure = function configure (gulp, opts, env) {
  const testEnv = Object.assign({
    testDeps: opts.transpile ? ['transpile'] : []
  }, env);

  let testTasks = [];
  if (opts.test) {
    unitTest.configure(gulp, opts, testEnv);
    testTasks.push('unit-test');
  }

  if (opts.e2eTest) {
    e2eTest.configure(gulp, opts, testEnv);
    testTasks.push('e2e-test');
  }

  if (testTasks.length) {
    gulp.task('test', gulp.series(testTasks));
  }
};

module.exports = {
  configure,
};
