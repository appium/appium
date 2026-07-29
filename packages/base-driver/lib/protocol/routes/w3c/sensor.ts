import type {Driver, MethodMap} from '@appium/types';

/**
 * W3C Generic Sensor.
 * @see https://www.w3.org/TR/generic-sensor/
 */
export const W3C_SENSOR_ROUTES = {
  '/session/:sessionId/sensor': {
    POST: {
      command: 'createVirtualSensor',
      payloadParams: {
        required: ['type'],
        optional: ['connected', 'maxSamplingFrequency', 'minSamplingFrequency'],
      },
    },
  },
  '/session/:sessionId/sensor/:sensorType': {
    GET: {command: 'getVirtualSensorInfo'},
    POST: {command: 'updateVirtualSensorReading', payloadParams: {required: ['reading']}},
    DELETE: {command: 'deleteVirtualSensor'},
  },
} as const satisfies MethodMap<Driver>;
