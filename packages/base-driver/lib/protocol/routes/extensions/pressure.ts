import type {Driver, MethodMap} from '@appium/types';

/**
 * Compute Pressure.
 * @see https://www.w3.org/TR/compute-pressure/
 */
export const PRESSURE_ROUTES = {
  '/session/:sessionId/pressuresource': {
    POST: {
      command: 'createVirtualPressureSource',
      payloadParams: {required: ['type'], optional: ['supported']},
    },
  },
  '/session/:sessionId/pressuresource/:pressureSourceType': {
    POST: {command: 'updateVirtualPressureSource', payloadParams: {required: ['sample']}},
    DELETE: {command: 'deleteVirtualPressureSource'},
  },
} as const satisfies MethodMap<Driver>;
