import type {BidiMethodMap} from '@appium/types';

export const SCRIPT_BIDI_COMMANDS = {
  addPreloadScript: {
    command: 'bidiScriptAddPreloadScript',
    params: {
      required: ['functionDeclaration'],
      optional: ['arguments', 'contexts', 'userContexts', 'sandbox'],
    },
  },
  callFunction: {
    command: 'bidiScriptCallFunction',
    params: {
      required: ['functionDeclaration', 'awaitPromise', 'target'],
      optional: ['arguments', 'resultOwnership', 'serializationOptions', 'this', 'userActivation'],
    },
  },
  disown: {
    command: 'bidiScriptDisown',
    params: {
      required: ['handles', 'target'],
    },
  },
  evaluate: {
    command: 'bidiScriptEvaluate',
    params: {
      required: ['expression', 'target', 'awaitPromise'],
      optional: ['resultOwnership', 'serializationOptions', 'userActivation'],
    },
  },
  getRealms: {
    command: 'bidiScriptGetRealms',
    params: {
      optional: ['context', 'type'],
    },
  },
  removePreloadScript: {
    command: 'bidiScriptRemovePreloadScript',
    params: {
      required: ['script'],
    },
  },
} as const satisfies BidiMethodMap;
