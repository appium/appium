import type {Driver, MethodMap} from '@appium/types';

/**
 * Global Privacy Control (GPC).
 * @see https://www.w3.org/TR/gpc/
 */
export const PRIVACY_ROUTES = {
  '/session/:sessionId/privacy': {
    GET: {command: 'getGlobalPrivacyControl'},
    POST: {command: 'setGlobalPrivacyControl', payloadParams: {required: ['gpc']}},
  },
} as const satisfies MethodMap<Driver>;
