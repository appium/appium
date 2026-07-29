import type {Driver, MethodMap} from '@appium/types';

/**
 * Appium: Session and capability introspection.
 */
export const APPIUM_SESSION_ROUTES = {
  '/appium/sessions': {
    GET: {command: 'getAppiumSessions'},
  },
  '/session/:sessionId/appium/capabilities': {
    GET: {command: 'getAppiumSessionCapabilities'},
  },
} as const satisfies MethodMap<Driver>;
