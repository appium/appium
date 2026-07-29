import type {Driver, MethodMap} from '@appium/types';

/**
 * Appium: Command/extension introspection and event reporting.
 */
export const APPIUM_COMMANDS_ROUTES = {
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
