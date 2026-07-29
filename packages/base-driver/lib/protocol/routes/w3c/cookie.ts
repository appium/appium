import type {Driver, MethodMap} from '@appium/types';

/**
 * W3C WebDriver: Cookies.
 * @see https://www.w3.org/TR/webdriver2/#cookies
 */
export const W3C_COOKIE_ROUTES = {
  '/session/:sessionId/cookie': {
    GET: {command: 'getCookies'},
    POST: {command: 'setCookie', payloadParams: {required: ['cookie']}},
    DELETE: {command: 'deleteCookies'},
  },
  '/session/:sessionId/cookie/:name': {
    GET: {command: 'getCookie'},
    DELETE: {command: 'deleteCookie'},
  },
} as const satisfies MethodMap<Driver>;
