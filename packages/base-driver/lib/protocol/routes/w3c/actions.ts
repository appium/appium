import type {Driver, MethodMap} from '@appium/types';

/**
 * W3C WebDriver: Actions.
 * @see https://www.w3.org/TR/webdriver2/#actions
 */
export const W3C_ACTIONS_ROUTES = {
  '/session/:sessionId/actions': {
    POST: {command: 'performActions', payloadParams: {required: ['actions']}},
    DELETE: {command: 'releaseActions'},
  },
} as const satisfies MethodMap<Driver>;
