'use strict';

module.exports = (wallaby) => {
  return {
    compilers: {
      '**/*.js': wallaby.compilers.babel(),
    },
    debug: true,
    env: {
      type: 'node',
    },
    files: [
      './packages/**/*.js',
      './packages/**/*.json',
      '!./packages/**/build/**',
      '!./packages/**/test/**/*-specs.js',
      '!./packages/**/test/**/*.spec.js',
      '!./packages/*/node_modules/**',
      '!./packages/*/gulpfile.js',
      '!./packages/*/scripts/**',
      './packages/*/test/**/fixtures/**/*',
      './packages/*/test/**/mocks.js',
      './packages/*/test/helpers.js',
      './babel.config.json',
      // below this are fixtures
      {
        binary: true,
        pattern: './packages/support/test/unit/assets/sample_binary.plist',
      },
      {
        instrument: false,
        pattern: './packages/support/test/unit/assets/sample_text.plist',
      },
      {
        instrument: false,
        pattern: './packages/base-driver/static/**/*',
      },
      {
        instrument: false,
        pattern: './packages/gulp-plugins/build/**/*',
      },
      // this setup file is special
      {
        instrument: false,
        pattern: './test/setup.js'
      },
      '!**/local_appium_home/**'
    ],
    testFramework: 'mocha',
    tests: [
      './packages/*/test/**/*-specs.js',
      './packages/*/test/unit/**/*.spec.js',
      '!./packages/*/test/**/*-e2e-specs.js',
      '!./packages/*/test/e2e/**/*',
      '!./packages/*/node_modules/**',
      // this is more of an E2E test and it's tedious to run
      '!./packages/gulp-plugins/test/transpile-specs.js',
      '!**/local_appium_home/**'
    ],
    workers: {
      restart: true,
    },
    setup() {
      require('./test/setup');
    },
    runMode: 'onsave'
  };
};
