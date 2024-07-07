// @ts-check

'use strict';

module.exports = {
  require: ['ts-node/register'],
  // forbids use of .only() in CI
  forbidOnly: Boolean(process.env.CI),
  color: true,
  timeout: '5s',
};
