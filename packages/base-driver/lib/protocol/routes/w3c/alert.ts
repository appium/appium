import type {Driver, MethodMap} from '@appium/types';

/**
 * W3C WebDriver: User prompts (alerts).
 * @see https://www.w3.org/TR/webdriver2/#user-prompts
 */
export const W3C_ALERT_ROUTES = {
  '/session/:sessionId/alert/dismiss': {
    POST: {command: 'postDismissAlert'},
  },
  '/session/:sessionId/alert/accept': {
    POST: {command: 'postAcceptAlert'},
  },
  '/session/:sessionId/alert/text': {
    GET: {command: 'getAlertText'},
    POST: {
      command: 'setAlertText',
      payloadParams: {
        required: ['text'],
      },
    },
  },
} as const satisfies MethodMap<Driver>;
