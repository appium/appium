import type {BidiMethodMap} from '@appium/types';

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
    params: {
      required: ['events'],
      optional: ['contexts', 'userContexts'],
    },
  },
  unsubscribe: {
    command: 'bidiUnsubscribe',
    params: {
      // either unsubscribe by previously-returned subscription ids, or by event names
      required: [['subscriptions'], ['events']],
    },
  },
} as const satisfies BidiMethodMap;
