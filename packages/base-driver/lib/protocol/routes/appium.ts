import type {Driver, MethodMap} from '@appium/types';

/**
 * Appium-specific routes: sessions, capabilities, settings, and command/extension
 * introspection. Device interaction routes live in {@link ./appium-device}.
 */
export const APPIUM_ROUTES = {
  '/appium/sessions': {
    GET: {command: 'getAppiumSessions'},
  },
  '/session/:sessionId/appium/rotation': {
    GET: {command: 'getRotation'},
    POST: {command: 'setRotation', payloadParams: {required: ['x', 'y', 'z']}},
  },
  '/session/:sessionId/appium/context': {
    GET: {command: 'getCurrentContext'},
    POST: {command: 'setContext', payloadParams: {required: ['name']}},
  },
  '/session/:sessionId/appium/contexts': {
    GET: {command: 'getContexts'},
  },
  '/session/:sessionId/appium/orientation': {
    GET: {command: 'getOrientation'},
    POST: {
      command: 'setOrientation',
      payloadParams: {required: ['orientation']},
    },
  },
  '/session/:sessionId/appium/capabilities': {
    GET: {command: 'getAppiumSessionCapabilities'},
  },
  '/session/:sessionId/appium/settings': {
    POST: {command: 'updateSettings', payloadParams: {required: ['settings']}},
    GET: {command: 'getSettings'},
  },
  '/session/:sessionId/appium/commands': {
    GET: {command: 'listCommands'},
  },
  '/session/:sessionId/appium/extensions': {
    GET: {command: 'listExtensions'},
  },
  '/session/:sessionId/appium/events': {
    POST: {command: 'getLogEvents', payloadParams: {optional: ['type']}},
  },
  '/session/:sessionId/appium/log_event': {
    POST: {
      command: 'logCustomEvent',
      payloadParams: {required: ['vendor', 'event']},
    },
  },
} as const satisfies MethodMap<Driver>;
