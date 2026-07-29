import type {Driver, MethodMap} from '@appium/types';

/**
 * W3C Device Posture.
 * @see https://www.w3.org/TR/device-posture/
 */
export const W3C_DEVICE_POSTURE_ROUTES = {
  '/session/:sessionId/deviceposture': {
    POST: {command: 'setDevicePosture', payloadParams: {required: ['posture']}},
    DELETE: {command: 'clearDevicePosture'},
  },
} as const satisfies MethodMap<Driver>;
