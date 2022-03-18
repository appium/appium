// transpile:mocha

import BaseDriver from '../../../lib';
import { baseDriverUnitTests } from '../../basedriver';

baseDriverUnitTests(BaseDriver, {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean'
});
