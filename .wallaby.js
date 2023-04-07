'use strict';

module.exports = (wallaby) => {
  return {
    compilers: {
      '**/*.js': wallaby.compilers.typeScript({
        allowJs: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        isolatedModules: true,
      }),
      '**/*.ts?(x)': wallaby.compilers.typeScript(),
    },
    debug: true,
    env: {
      type: 'node',
    },
    files: [
      './packages/*/build/**/*',
      './packages/*/lib/**/*.{js,ts}',
      './packages/*/test/**/*helper*.{js,ts}',
      './packages/*/test/**/*mock*.{js,ts}',
      './packages/*/package.json',
      './packages/*/tsconfig*.json',
      './packages/*/test/**/fixture?(s)/**/*',
      {
        instrument: false,
        pattern: './packages/typedoc-plugin-appium/resources/**/*',
      },
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
        pattern: './packages/typedoc-plugin-appium/lib/theme/resources/**',
      },
      '!./packages/*/test/**/*-specs.js',
      '!./packages/*/test/**/*.e2e.spec.{js,ts}',
      '!**/local_appium_home/**',
    ],
    testFramework: 'mocha',
    tests: ['./packages/*/test/unit/**/*.spec.{js,ts}', '!**/local_appium_home/**'],
    workers: {
      // restart: true,
    },
    setup(wallaby) {
      // copied out of `./test/setup.js`

      const chai = require('chai');
      const chaiAsPromised = require('chai-as-promised');
      const sinonChai = require('sinon-chai');

      // The `chai` global is set if a test needs something special.
      // Most tests won't need this.
      global.chai = chai.use(chaiAsPromised).use(sinonChai);

      // `should()` is only necessary when working with some `null` or `undefined` values.
      global.should = chai.should();

      const mocha = wallaby.testFramework;
      mocha.timeout(10000);
    },
    runMode: 'onsave',
  };
};
