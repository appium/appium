import BaseDriver from '../../../lib';
import {driverUnitTestSuite} from '@appium/driver-test-support';

driverUnitTestSuite(BaseDriver, {
  platformName: 'iOS',
  'appium:deviceName': 'Delorean',
});
