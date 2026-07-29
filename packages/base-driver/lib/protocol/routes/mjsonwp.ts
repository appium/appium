import type {Driver, MethodMap} from '@appium/types';

/**
 * MJSONWP (mobile) routes.
 * @see https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md
 */
export const MJSONWP_ROUTES = {
  '/session/:sessionId/rotation': {
    GET: {command: 'getRotation'},
    POST: {command: 'setRotation', payloadParams: {required: ['x', 'y', 'z']}},
  },
  '/session/:sessionId/context': {
    GET: {command: 'getCurrentContext'},
    POST: {command: 'setContext', payloadParams: {required: ['name']}},
  },
  '/session/:sessionId/contexts': {
    GET: {command: 'getContexts'},
  },
  '/session/:sessionId/network_connection': {
    GET: {command: 'getNetworkConnection', deprecated: true},
    POST: {
      command: 'setNetworkConnection',
      payloadParams: {unwrap: 'parameters', required: ['type']},
      deprecated: true,
    },
  },
} as const satisfies MethodMap<Driver>;
