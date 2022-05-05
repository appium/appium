'use strict';

const boilerplate = require('./index').boilerplate.use(require('gulp'));

require('./test/gulpfile-js');

boilerplate({
  transpile: true,
  files: ['index.js', 'lib/**/*.js', 'test/**/*.js', '!test/fixtures/**', '!test/generated/**'],
  test: {
    files: ['${testDir}/**/*-specs.js', '!${testDir}/fixtures', '!${testDir}/**/*-e2e-specs.js'],
  },
  coverage: {
    files: [
      './build/test/**/*-specs.js',
      '!./build/test/fixtures',
      '!./build/test/**/*-e2e-specs.js',
      '!./build/test/generated',
    ],
    verbose: true,
  },
  build: 'Appium Gulp Plugins',
  extraDefaultTasks: ['e2e-test', 'test-transpile-lots-of-files'],
  testReporter: 'dot',
});
