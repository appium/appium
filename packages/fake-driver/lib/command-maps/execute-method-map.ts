import type {ExecuteMethodMap} from '@appium/types';
import type {FakeDriver} from '../driver';

export const EXECUTE_METHOD_MAP = {
  'fake: addition': {
    command: 'fakeAddition',
    params: {required: ['num1', 'num2'], optional: ['num3']},
  },
  'fake: getThing': {
    command: 'getFakeThing',
  },
  'fake: setThing': {
    command: 'setFakeThing',
    params: {required: ['thing']},
  },
  'fake: getDeprecatedCommandsCalled': {
    command: 'getDeprecatedCommandsCalled',
  },
} as const satisfies ExecuteMethodMap<FakeDriver>;
