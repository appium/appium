// transpile:mocha

import BaseDriver from '../../index.js';
import baseDriverE2ETests from './driver-e2e-tests.js';
baseDriverE2ETests(BaseDriver, {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean'
});
