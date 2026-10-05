import type {BidiModuleMap} from '@appium/types';

const SUBSCRIBE_PARAMS = {
  required: ['events'],
  optional: ['contexts'],
} as const;

// `events`/`contexts` is the legacy form; `subscriptions` is the spec form. They are mutually
// exclusive, which bidiUnsubscribe validates.
const UNSUBSCRIBE_PARAMS = {
  optional: ['events', 'contexts', 'subscriptions'],
} as const;

export const BIDI_COMMANDS = {
  session: {
    subscribe: {
      command: 'bidiSubscribe',
      params: SUBSCRIBE_PARAMS,
    },
    unsubscribe: {
      command: 'bidiUnsubscribe',
      params: UNSUBSCRIBE_PARAMS,
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
