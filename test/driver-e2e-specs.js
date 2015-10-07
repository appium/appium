// transpile:mocha

import BaseDriver from '../lib/driver';
import baseDriverE2ETests from './driver-e2e-tests';
baseDriverE2ETests(BaseDriver, {
  platformName: 'iOS',
  deviceName: 'Delorean'
});
