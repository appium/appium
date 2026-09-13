import type {BidiMethodMap} from '@appium/types';

const SUBSCRIPTION_REQUEST_PARAMS = {
  required: ['events'],
  optional: ['contexts'],
} as const;

export const SESSION_BIDI_COMMANDS = {
  status: {
    command: 'bidiStatus',
    params: {},
  },
  new: {
    command: 'bidiSessionNew',
    params: {
      required: ['capabilities'],
    },
  },
  end: {
    command: 'bidiSessionEnd',
    params: {},
  },
  subscribe: {
    command: 'bidiSubscribe',
    params: SUBSCRIPTION_REQUEST_PARAMS,
  },
  unsubscribe: {
    command: 'bidiUnsubscribe',
    params: SUBSCRIPTION_REQUEST_PARAMS,
  },
} as const satisfies BidiMethodMap;
