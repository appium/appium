/**
 * This function is necessary to workaround unexpected memory leaks
 * caused by NodeJS string interning
 * behavior described in https://bugs.chromium.org/p/v8/issues/detail?id=2869
 *
 * @param {any} s - The string to unleak
 * @return {string} Either the unleaked string or the original object converted to string
 */
export function unleakString(s: any): string {
  return ` ${s}`.substring(1);
}
