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
      '!**/local_appium_home/**',
    ],
    testFramework: 'mocha',
    tests: ['./packages/*/test/unit/**/*.spec.js'],
    workers: {
      restart: true,
    },
    setup() {
      // This copied out of `./test/setup.js`, which uses `@babel/register`.
      // Wallaby doesn't need `@babel/register` (and it probably makes Wallaby slow),
      // but we need the other stuff, so here it is.

      const chai = require('chai');
      const chaiAsPromised = require('chai-as-promised');
      const sinonChai = require('sinon-chai');

      // The `chai` global is set if a test needs something special.
      // Most tests won't need this.
      global.chai = chai.use(chaiAsPromised).use(sinonChai);

      // `should()` is only necessary when working with some `null` or `undefined` values.
      global.should = chai.should();
    },
    runMode: 'onsave',
  };
};
