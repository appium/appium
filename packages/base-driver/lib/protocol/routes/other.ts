import type {Driver, MethodMap} from '@appium/types';

/**
 * Vendor-specific and non-W3C-track web platform routes.
 */
export const OTHER_PROTOCOLS_ROUTES = {
  // Selenium/Chromium browsers
  '/session/:sessionId/se/log': {
    POST: {command: 'getLog', payloadParams: {required: ['type']}},
  },
  '/session/:sessionId/se/log/types': {
    GET: {command: 'getLogTypes'},
  },
  // Chromium devtools
  // https://chromium.googlesource.com/chromium/src/+/master/chrome/test/chromedriver/server/http_handler.cc
  '/session/:sessionId/:vendor/cdp/execute': {
    POST: {command: 'executeCdp', payloadParams: {required: ['cmd', 'params']}},
  },
  // Custom Handlers
  // https://html.spec.whatwg.org/multipage/system-state.html#user-agent-automation
  '/session/:sessionId/custom-handlers/set-mode': {
    POST: {command: 'setRPHRegistrationMode', payloadParams: {required: ['mode']}},
  },
  // Storage Access
  // https://privacycg.github.io/storage-access/
  '/session/:sessionId/storageaccess': {
    POST: {command: 'setStorageAccess', payloadParams: {required: ['blocked', 'origin']}},
  },
} as const satisfies MethodMap<Driver>;
