// @ts-check

'use strict';

module.exports = {
  require: ['ts-node/register'],
  forbidOnly: Boolean(process.env.CI),
  color: true,
  timeout: '5s',
};
