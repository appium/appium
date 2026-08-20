import type {Driver, MethodMap} from '@appium/types';

/**
 * MJSONWP (mobile) routes.
 * @see https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md
 */
export const MJSONWP_ROUTES = {
  '/session/:sessionId/rotation': {
    GET: {command: 'getRotation', deprecated: true},
    POST: {command: 'setRotation', payloadParams: {required: ['x', 'y', 'z']}, deprecated: true},
  },
  '/session/:sessionId/context': {
    GET: {command: 'getCurrentContext', deprecated: true},
    POST: {command: 'setContext', payloadParams: {required: ['name']}, deprecated: true},
  },
  '/session/:sessionId/contexts': {
    GET: {command: 'getContexts', deprecated: true},
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
