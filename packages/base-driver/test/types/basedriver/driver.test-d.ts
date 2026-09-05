import {BaseDriverCapConstraints, Driver, DriverOpts, ExternalDriver} from '@appium/types';
import {expectAssignable} from 'tsd';

import {BaseDriver} from '@appium/base-driver';

expectAssignable<Driver<BaseDriverCapConstraints>>(
  new BaseDriver<BaseDriverCapConstraints>({} as DriverOpts<BaseDriverCapConstraints>),
);
expectAssignable<ExternalDriver<BaseDriverCapConstraints>>(
  new BaseDriver<BaseDriverCapConstraints>({} as DriverOpts<BaseDriverCapConstraints>),
);
