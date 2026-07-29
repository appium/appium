import type {Driver, MethodMap} from '@appium/types';

/**
 * JSONWP (legacy) routes.
 * @see https://www.selenium.dev/documentation/legacy/json_wire_protocol/
 */
export const JSONWP_ROUTES = {
  '/session/:sessionId/ime/available_engines': {
    GET: {command: 'availableIMEEngines', deprecated: true},
  },
  '/session/:sessionId/ime/active_engine': {
    GET: {command: 'getActiveIMEEngine', deprecated: true},
  },
  '/session/:sessionId/ime/activated': {
    GET: {command: 'isIMEActivated', deprecated: true},
  },
  '/session/:sessionId/ime/deactivate': {
    POST: {command: 'deactivateIMEEngine', deprecated: true},
  },
  '/session/:sessionId/ime/activate': {
    POST: {
      command: 'activateIMEEngine',
      payloadParams: {required: ['engine']},
      deprecated: true,
    },
  },
  '/session/:sessionId/orientation': {
    GET: {command: 'getOrientation'},
    POST: {
      command: 'setOrientation',
      payloadParams: {required: ['orientation']},
    },
  },
  '/session/:sessionId/location': {
    GET: {
      command: 'getGeoLocation',
      deprecated: true,
    },
    POST: {
      command: 'setGeoLocation',
      payloadParams: {required: ['location']},
      deprecated: true,
    },
  },
  '/session/:sessionId/receive_async_response': {
    POST: {
      command: 'receiveAsyncResponse',
      payloadParams: {required: ['status', 'value']},
      deprecated: true,
    },
  },
  '/session/:sessionId/element/:elementId': {
    GET: {},
  },
} as const satisfies MethodMap<Driver>;
