import type {Driver, MethodMap} from '@appium/types';

/**
 * W3C WebDriver: Document (source and script execution).
 * @see https://www.w3.org/TR/webdriver2/#document
 */
export const W3C_DOCUMENT_ROUTES = {
  '/session/:sessionId/source': {
    GET: {command: 'getPageSource'},
  },
  '/session/:sessionId/execute/sync': {
    POST: {command: 'execute', payloadParams: {required: ['script', 'args']}},
  },
  '/session/:sessionId/execute/async': {
    POST: {
      command: 'executeAsync',
      payloadParams: {required: ['script', 'args']},
    },
  },
} as const satisfies MethodMap<Driver>;
