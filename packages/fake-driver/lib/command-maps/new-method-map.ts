import type {MethodMap} from '@appium/types';
import type {FakeDriver} from '../driver';

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
} as const satisfies MethodMap<FakeDriver>;
