import type {Driver, MethodMap} from '@appium/types';

/**
 * W3C WebDriver: Screen capture and printing.
 * @see https://www.w3.org/TR/webdriver2/#screen-capture
 * @see https://www.w3.org/TR/webdriver2/#print
 */
export const W3C_CAPTURE_ROUTES = {
  '/session/:sessionId/screenshot': {
    GET: {command: 'getScreenshot'},
  },
  '/session/:sessionId/element/:elementId/screenshot': {
    GET: {command: 'getElementScreenshot'},
  },
  '/session/:sessionId/print': {
    POST: {
      command: 'printPage',
      payloadParams: {
        optional: ['orientation', 'scale', 'background', 'page', 'margin', 'shrinkToFit', 'pageRanges'],
      },
    },
  },
} as const satisfies MethodMap<Driver>;
