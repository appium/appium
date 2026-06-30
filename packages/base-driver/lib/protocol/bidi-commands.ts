import type {BidiModuleMap} from '@appium/types';

const SUBSCRIPTION_REQUEST_PARAMS = {
  required: ['events'],
  optional: ['contexts'],
} as const;

export const BIDI_COMMANDS = {
  session: {
    subscribe: {
      command: 'bidiSubscribe',
      params: SUBSCRIPTION_REQUEST_PARAMS,
    },
    unsubscribe: {
      command: 'bidiUnsubscribe',
      params: SUBSCRIPTION_REQUEST_PARAMS,
    },
    status: {
      command: 'bidiStatus',
      params: {},
    },
  },
  browsingContext: {
    navigate: {
      command: 'bidiNavigate',
      params: {
        required: ['context', 'url'],
        optional: ['wait'],
      },
    },
  },
} as const satisfies BidiModuleMap;

// TODO add definitions for all bidi commands.
// spec link: https://w3c.github.io/webdriver-bidi/
