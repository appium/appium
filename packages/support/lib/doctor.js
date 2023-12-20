import {getLogger} from './logging';

export const SKIP_AUTOFIX_ERROR_NAME = 'FixSkippedError';

/**
 * A shortcut for a successful required doctor check
 *
 * @param {string} message
 * @returns {DoctorCheckResult}
 */
export function ok(message) {
  return {ok: true, optional: false, message};
}

/**
 * A shortcut for an unsuccessful required doctor check
 *
 * @param {string} message
 * @returns {DoctorCheckResult}
 */
export function nok(message) {
  return {ok: false, optional: false, message};
}

/**
 * A shortcut for a successful optional doctor check
 *
 * @param {string} message
 * @returns {DoctorCheckResult}
 */
export function okOptional(message) {
  return {ok: true, optional: true, message};
}

/**
 * A shortcut for an unsuccessful optional doctor check
 *
 * @param {string} message
 * @returns {DoctorCheckResult}
 */
export function nokOptional(message) {
  return {ok: false, optional: true, message};
}

/** @type {import('@appium/types').AppiumLogger|undefined} */
let doctorLogger;

/**
 * Configures the logger used in doctor checks
 *
 * @param {string} [prefix='Doctor']
 * @returns {import('@appium/types').AppiumLogger}
 */
export function configureLogger(prefix = 'Doctor') {
  doctorLogger = doctorLogger ?? getLogger(prefix);
  return doctorLogger;
}

/**
 * @typedef {import('@appium/types').DoctorCheckResult} DoctorCheckResult
 */
