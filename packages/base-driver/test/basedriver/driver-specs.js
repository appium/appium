// transpile:mocha

import BaseDriver from '../..';
import baseDriverUnitTests from './driver-tests';
baseDriverUnitTests(BaseDriver, {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean'
});
