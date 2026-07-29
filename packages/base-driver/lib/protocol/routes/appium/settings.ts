import type {Driver, MethodMap} from '@appium/types';

/**
 * Appium: Driver/session settings.
 */
export const APPIUM_SETTINGS_ROUTES = {
  '/session/:sessionId/appium/settings': {
    POST: {command: 'updateSettings', payloadParams: {required: ['settings']}},
    GET: {command: 'getSettings'},
  },
} as const satisfies MethodMap<Driver>;
