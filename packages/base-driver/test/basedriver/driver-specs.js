// transpile:mocha

import BaseDriver from '../../index.js';
import baseDriverUnitTests from './driver-tests.js';
baseDriverUnitTests(BaseDriver, {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean'
});
