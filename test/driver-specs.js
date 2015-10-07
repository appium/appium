// transpile:mocha

import BaseDriver from '../lib/driver';
import baseDriverUnitTests from './driver-tests';
baseDriverUnitTests(BaseDriver, {
  platformName: 'iOS',
  deviceName: 'Delorean'
});
