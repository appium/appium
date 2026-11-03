import type {BidiModuleMap} from '@appium/types';

export const NEW_BIDI_COMMANDS = {
  'appium:fake': {
    getFakeThing: {
      command: 'getFakeThing',
    },
    setFakeThing: {
      command: 'setFakeThing',
      params: {
        required: ['thing'],
      },
    },
    doSomeMath: {
      command: 'doSomeMath',
      params: {
        required: ['num1', 'num2'],
      },
    },
    doSomeMath2: {
      command: 'doSomeMath2',
      params: {
        required: ['num1', 'num2'],
      },
    },
  },
} as const satisfies BidiModuleMap;
