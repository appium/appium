// transpile:main

import yargs from 'yargs';
//import _ from 'lodash';
import newDoctor from '../lib/factory';
import { configureBinaryLog } from '../lib/utils';
import { configure as configurePrompt } from '../lib/prompt';

yargs
  .strict()
  .usage('Usage: $0 [options, defaults: --ios --android]')
  .boolean('ios')
  .describe('ios', 'Check iOS setup')
  .boolean('android')
  .describe('android', 'Check Android setup')
  .boolean('dev')
  .describe('dev', 'Check dev setup')
  .boolean('debug')
  .describe('debug', 'Show debug messages')
  .boolean('yes')
  .describe('yes', 'Always respond yes')
  .boolean('no')
  .describe('no', 'Always respond no')
  .boolean('demo')
  .describe('demo', 'Run appium-doctor demo (for dev).')
  .help('h')
  .alias('h', 'help')
  .check(function(argv) {
    if(!argv.ios && !argv.android && !argv.demo) {
      argv.ios = true;
      argv.android = true;
    }
    return true;
  });
let opts = yargs.argv;

configurePrompt(opts);
configureBinaryLog(opts);
newDoctor(opts).run();
