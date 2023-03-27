export {createSessionHelpers, driverE2ETestSuite} from './e2e-suite';
export * from './unit-suite';
export * from './helpers';

// eslint-disable-next-line import/no-unresolved
export * from './stoppable';

/**
 * @typedef {import('@appium/types').DriverClass} DriverClass
 * @typedef {import('@appium/types').BaseNSCapabilities} BaseNSCapabilities
 */

/**
 * @template {import('@appium/types').Constraints} C
 * @typedef {import('@appium/types').W3CCapabilities<C>} W3CCapabilities
 */
