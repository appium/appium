// @ts-check

'use strict';

module.exports = {
  require: [require.resolve('./test/setup.js')],
  // forbids use of .only() in CI
  forbidOnly: Boolean(process.env.CI),
  // increase default timeout for CI since it can be slow
  timeout: process.env.CI ? '5s' : '2s',
};
