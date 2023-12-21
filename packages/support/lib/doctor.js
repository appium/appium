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

/**
 * Throw this exception in the fix() method
 * of your doctor check to skip the actual fix if hasAutofix() is true
 */
export class FixSkippedError extends Error {}

/**
 * @typedef {import('@appium/types').DoctorCheckResult} DoctorCheckResult
 */
