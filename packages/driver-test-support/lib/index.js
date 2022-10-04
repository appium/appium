export {createSessionHelpers, driverE2ETestSuite} from './e2e-suite';
export * from './unit-suite';
export * from './helpers';

/**
 * @typedef {import('@appium/types').DriverClass} DriverClass
 * @typedef {import('@appium/types').BaseNSCapabilities} BaseNSCapabilities
 */

/**
 * @template {import('@appium/types').Constraints} [C=import('@appium/types').BaseDriverCapConstraints]
 * @template {import('@appium/types').StringRecord|void} [Extra=void]
 * @typedef {import('@appium/types').W3CCapabilities<C, Extra>} W3CCapabilities
 */
