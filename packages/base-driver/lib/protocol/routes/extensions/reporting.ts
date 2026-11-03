import type {Driver, MethodMap} from '@appium/types';

/**
 * Reporting API: test report generation.
 * @see https://www.w3.org/TR/reporting-1/
 */
export const REPORTING_ROUTES = {
  '/session/:sessionId/reporting/generate_test_report': {
    POST: {
      command: 'generateTestReport',
      payloadParams: {required: ['message'], optional: ['group']},
    },
  },
} as const satisfies MethodMap<Driver>;
