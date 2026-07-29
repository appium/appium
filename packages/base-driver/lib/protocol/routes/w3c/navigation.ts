import type {Driver, MethodMap} from '@appium/types';

/**
 * W3C WebDriver: Navigation.
 * @see https://www.w3.org/TR/webdriver2/#navigation
 */
export const W3C_NAVIGATION_ROUTES = {
  '/session/:sessionId/url': {
    GET: {command: 'getUrl'},
    POST: {command: 'setUrl', payloadParams: {required: ['url']}},
  },
  '/session/:sessionId/forward': {
    POST: {command: 'forward'},
  },
  '/session/:sessionId/back': {
    POST: {command: 'back'},
  },
  '/session/:sessionId/refresh': {
    POST: {command: 'refresh'},
  },
  '/session/:sessionId/title': {
    GET: {command: 'title'},
  },
} as const satisfies MethodMap<Driver>;
