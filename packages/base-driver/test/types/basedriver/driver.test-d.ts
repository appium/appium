import {expectAssignable} from 'tsd';
// NOTE: this pulls in the distfiles
import {BaseDriver} from '.../../..';
import {BaseDriverCapConstraints, ExternalDriver, Driver, DriverOpts} from '@appium/types';

expectAssignable<Driver<BaseDriverCapConstraints>>(
  new BaseDriver({} as DriverOpts<BaseDriverCapConstraints>)
);
expectAssignable<ExternalDriver<BaseDriverCapConstraints>>(
  new BaseDriver({} as DriverOpts<BaseDriverCapConstraints>)
);
