import {expectType} from 'tsd';
import {BaseDriver} from '.../../../build/lib/basedriver/driver';
import {BaseDriverCapConstraints, Driver} from '@appium/types';

expectType<Driver<BaseDriverCapConstraints>>(new BaseDriver());
