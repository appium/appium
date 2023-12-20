import type { AppiumLogger } from './logger';

/**
 * The object with below properties is expected
 * to be returned from the Doctor Check's {@link diagnose} method
 */
export interface DoctorCheckResult {
  /**
   * Whether the diagnosis found no issues
   */
  ok: boolean;
  /**
   * Whether the diagnosed issue is safe to ignore
   */
  optional: boolean;
  /**
   * The text message describing the diagnostic result
   */
  message: string;
}

/**
 * Each compatible Doctor Check class must implement this interface
 */
export interface IDoctorCheck {
  /**
   * This property will be assigned by the server automatically if unset
   */
  log: AppiumLogger;

  /**
   * Diagnoses the actual problem
   */
  diagnose(): Promise<DoctorCheckResult>;
  /**
   * Either fixes the actual problem
   * if hasAutofix returns true or
   * returns a string description for possible manual fixes
   */
  fix(): Promise<string|null>;
  /**
   * Whether calling {@link fix()} would resolve the found issue
   */
  hasAutofix(): boolean;
  /**
   * Whether the found issue can be ignored and is not a showstopper
   */
  isOptional(): boolean;
}
