import type {Driver, MethodMap} from '@appium/types';

/**
 * W3C Global Privacy Control (GPC).
 * @see https://www.w3.org/TR/gpc/
 */
export const W3C_PRIVACY_ROUTES = {
  '/session/:sessionId/privacy': {
    GET: {command: 'getGlobalPrivacyControl'},
    POST: {command: 'setGlobalPrivacyControl', payloadParams: {required: ['gpc']}},
  },
} as const satisfies MethodMap<Driver>;
