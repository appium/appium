import type {Driver, MethodMap} from '@appium/types';

/**
 * W3C WebDriver: Sessions and Timeouts.
 * @see https://www.w3.org/TR/webdriver2/#sessions
 * @see https://www.w3.org/TR/webdriver2/#timeouts
 */
export const W3C_SESSION_ROUTES = {
  '/session': {
    POST: {
      command: 'createSession',
      payloadParams: {
        optional: ['capabilities', 'capabilities', 'capabilities'],
      },
    },
  },
  '/session/:sessionId': {
    // TODO: JSONWP route, remove in the future
    GET: {command: 'getSession', deprecated: true},
    DELETE: {command: 'deleteSession'},
  },
  '/status': {
    GET: {command: 'getStatus'},
  },
  '/session/:sessionId/timeouts': {
    GET: {command: 'getTimeouts'},
    POST: {
      command: 'timeouts',
      payloadParams: {
        optional: ['type', 'ms', 'script', 'pageLoad', 'implicit'],
      },
    },
  },
} as const satisfies MethodMap<Driver>;
