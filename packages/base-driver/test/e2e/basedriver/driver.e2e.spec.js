// transpile:mocha

import BaseDriver from '../../../lib';
import baseDriverE2ETests from '../../basedriver/driver-e2e-tests';
baseDriverE2ETests(BaseDriver, {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean',
});
