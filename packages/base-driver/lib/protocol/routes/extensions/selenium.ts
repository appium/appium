import type {Driver, MethodMap} from '@appium/types';

/**
 * Selenium/Chromium browser log retrieval.
 */
export const SELENIUM_ROUTES = {
  '/session/:sessionId/se/log': {
    POST: {command: 'getLog', payloadParams: {required: ['type']}},
  },
  '/session/:sessionId/se/log/types': {
    GET: {command: 'getLogTypes'},
  },
} as const satisfies MethodMap<Driver>;
