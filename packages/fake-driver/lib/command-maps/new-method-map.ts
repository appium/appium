import type {MethodMap} from '@appium/types';

import type {FakeDriver} from '../driver.js';

export const NEW_METHOD_MAP = {
  '/session/:sessionId/fakedriver': {
    GET: {command: 'getFakeThing'},
    POST: {command: 'setFakeThing', payloadParams: {required: ['thing'] as const}},
  },
  '/session/:sessionId/fakedriverargs': {
    GET: {command: 'getFakeDriverArgs'},
  },
  '/session/:sessionId/deprecated': {
    POST: {command: 'callDeprecatedCommand', deprecated: true},
  },
  '/session/:sessionId/doubleclick': {
    POST: {command: 'doubleClick'},
  },
  '/session/:sessionId/context': {
    GET: {command: 'getCurrentContext'},
    POST: {command: 'setContext', payloadParams: {required: ['name']}},
  },
  '/session/:sessionId/contexts': {
    GET: {command: 'getContexts'},
  },
  '/session/:sessionId/orientation': {
    GET: {command: 'getOrientation'},
    POST: {
      command: 'setOrientation',
      payloadParams: {required: ['orientation']},
    },
  },
  '/session/:sessionId/location': {
    GET: {command: 'getGeoLocation'},
    POST: {command: 'setGeoLocation', payloadParams: {required: ['location']}},
  },
} as const satisfies MethodMap<FakeDriver>;
