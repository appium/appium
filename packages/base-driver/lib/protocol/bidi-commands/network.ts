import type {BidiMethodMap} from '@appium/types';

export const NETWORK_BIDI_COMMANDS = {
  addDataCollector: {
    command: 'bidiNetworkAddDataCollector',
    params: {
      required: ['dataTypes', 'maxEncodedDataSize'],
      optional: ['collectorType', 'contexts', 'userContexts'],
    },
  },
  addIntercept: {
    command: 'bidiNetworkAddIntercept',
    params: {
      required: ['phases'],
      optional: ['contexts', 'urlPatterns'],
    },
  },
  continueRequest: {
    command: 'bidiNetworkContinueRequest',
    params: {
      required: ['request'],
      optional: ['body', 'cookies', 'headers', 'method', 'url'],
    },
  },
  continueResponse: {
    command: 'bidiNetworkContinueResponse',
    params: {
      required: ['request'],
      optional: ['cookies', 'credentials', 'headers', 'reasonPhrase', 'statusCode'],
    },
  },
  continueWithAuth: {
    command: 'bidiNetworkContinueWithAuth',
    params: {
      required: ['request', 'action'],
      optional: ['credentials'],
    },
  },
  disownData: {
    command: 'bidiNetworkDisownData',
    params: {
      required: ['dataType', 'collector', 'request'],
    },
  },
  failRequest: {
    command: 'bidiNetworkFailRequest',
    params: {
      required: ['request'],
    },
  },
  getData: {
    command: 'bidiNetworkGetData',
    params: {
      required: ['dataType', 'request'],
      optional: ['collector', 'disown'],
    },
  },
  provideResponse: {
    command: 'bidiNetworkProvideResponse',
    params: {
      required: ['request'],
      optional: ['body', 'cookies', 'headers', 'reasonPhrase', 'statusCode'],
    },
  },
  removeDataCollector: {
    command: 'bidiNetworkRemoveDataCollector',
    params: {
      required: ['collector'],
    },
  },
  removeIntercept: {
    command: 'bidiNetworkRemoveIntercept',
    params: {
      required: ['intercept'],
    },
  },
  setCacheBehavior: {
    command: 'bidiNetworkSetCacheBehavior',
    params: {
      required: ['cacheBehavior'],
      optional: ['contexts'],
    },
  },
  setExtraHeaders: {
    command: 'bidiNetworkSetExtraHeaders',
    params: {
      required: ['headers'],
      optional: ['contexts', 'userContexts'],
    },
  },
} as const satisfies BidiMethodMap;
