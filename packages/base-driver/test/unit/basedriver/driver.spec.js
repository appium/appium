import BaseDriver from '../../../lib';
import {driverUnitTestSuite} from '@appium/test-support';

driverUnitTestSuite(BaseDriver, {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean',
});
