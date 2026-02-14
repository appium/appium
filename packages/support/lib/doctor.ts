import type {DoctorCheckResult} from '@appium/types';

/**
 * A shortcut for a successful required doctor check
 */
export function ok(message: string): DoctorCheckResult {
  return {ok: true, optional: false, message};
}

/**
 * A shortcut for an unsuccessful required doctor check
 */
export function nok(message: string): DoctorCheckResult {
  return {ok: false, optional: false, message};
}

/**
 * A shortcut for a successful optional doctor check
 */
export function okOptional(message: string): DoctorCheckResult {
  return {ok: true, optional: true, message};
}

/**
 * A shortcut for an unsuccessful optional doctor check
 */
export function nokOptional(message: string): DoctorCheckResult {
  return {ok: false, optional: true, message};
}

/**
 * Throw this exception in the fix() method
 * of your doctor check to skip the actual fix if hasAutofix() is true
 */
export class FixSkippedError extends Error {}
