// @ts-check

'use strict';

module.exports = {
  require: [
    require.resolve('./test/setup.js')
  ],
  // forbids use of .only() in CI 
  forbidOnly: Boolean(process.env.CI),
  color: true
};
