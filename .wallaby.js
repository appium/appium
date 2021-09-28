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
      '!./packages/*/node_modules/**',
      '!./packages/*/gulpfile.js',
      './packages/*/test/**/fixtures/**/*',
      // below this are fixtures
      {
        binary: true,
        pattern: './packages/support/test/assets/sample_binary.plist',
      },
      {
        instrument: false,
        pattern: './packages/support/test/assets/sample_text.plist',
      },
      {
        instrument: false,
        pattern: './packages/base-driver/static/**/*',
      },
      {
        instrument: false,
        pattern: './packages/gulp-plugins/build/**/*',
      },
      {
        instrument: false,
        pattern: './test/setup.js'
      }
    ],
    testFramework: 'mocha',
    tests: [
      './packages/*/test/**/*-specs.js',
      '!./packages/*/test/**/*-e2e-specs.js',
      '!./packages/*/node_modules/**',
      // this is more of an E2E test and it's tedious to run
      '!./packages/gulp-plugins/test/transpile-specs.js',
    ],
    workers: {
      restart: true,
    },
    setup() {
      require('./test/setup');
    }
  };
};
