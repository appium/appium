import {BaseDriver} from '.../../../lib/basedriver/driver';
import {BaseDriverCapConstraints, Driver, DriverOpts, ExternalDriver} from '@appium/types';
import {expectAssignable} from 'tsd';

expectAssignable<Driver<BaseDriverCapConstraints>>(
  new BaseDriver<BaseDriverCapConstraints>({} as DriverOpts<BaseDriverCapConstraints>),
);
expectAssignable<ExternalDriver<BaseDriverCapConstraints>>(
  new BaseDriver<BaseDriverCapConstraints>({} as DriverOpts<BaseDriverCapConstraints>),
);
