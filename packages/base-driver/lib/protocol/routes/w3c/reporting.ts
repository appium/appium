import type {Driver, MethodMap} from '@appium/types';

/**
 * W3C Reporting API: test report generation.
 * @see https://www.w3.org/TR/reporting-1/
 */
export const W3C_REPORTING_ROUTES = {
  '/session/:sessionId/reporting/generate_test_report': {
    POST: {
      command: 'generateTestReport',
      payloadParams: {required: ['message'], optional: ['group']},
    },
  },
} as const satisfies MethodMap<Driver>;
