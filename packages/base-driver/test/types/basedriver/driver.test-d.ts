import {expectAssignable} from 'tsd';
import {BaseDriver} from '.../../../lib/basedriver/driver';
import {BaseDriverCapConstraints, ExternalDriver, Driver, DriverOpts} from '@appium/types';

expectAssignable<Driver<BaseDriverCapConstraints>>(
  new BaseDriver<BaseDriverCapConstraints>({} as DriverOpts<BaseDriverCapConstraints>),
);
expectAssignable<ExternalDriver<BaseDriverCapConstraints>>(
  new BaseDriver<BaseDriverCapConstraints>({} as DriverOpts<BaseDriverCapConstraints>),
);
