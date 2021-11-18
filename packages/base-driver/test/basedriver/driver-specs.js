// transpile:mocha

import BaseDriver from '../../lib';
import baseDriverUnitTests from './driver-tests';
baseDriverUnitTests(BaseDriver, {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean'
});
