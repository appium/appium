import type {Driver, MethodMap} from '@appium/types';

/**
 * JSONWP (legacy) routes.
 * @see https://www.selenium.dev/documentation/legacy/json_wire_protocol/
 */
export const JSONWP_ROUTES = {
  '/session/:sessionId/orientation': {
    GET: {command: 'getOrientation', deprecated: true},
    POST: {
      command: 'setOrientation',
      payloadParams: {required: ['orientation']},
      deprecated: true,
    },
  },
} as const satisfies MethodMap<Driver>;
