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
      // non-standard: not part of the spec, but kept for backward compatibility, since
      // bidiUnsubscribe uses it to scope which contexts' subscriptions get removed
      optional: ['contexts'],
      validate: ({events, subscriptions, contexts}) => {
        if (subscriptions !== undefined && (events !== undefined || contexts !== undefined)) {
          return 'subscriptions cannot be combined with events or contexts';
        }
        return undefined;
      },
      // Preserve the selected alternative; otherwise IDs and event names become the same argument.
      makeArgs: ({events, contexts, subscriptions}) => [events, contexts, subscriptions],
    },
  },
} as const satisfies BidiMethodMap;
