import os from 'node:os';

/**
 * Whether the current OS is Windows.
 */
export function isWindows(): boolean {
  return os.type() === 'Windows_NT';
}
