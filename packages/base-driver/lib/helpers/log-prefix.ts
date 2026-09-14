import {node} from '@appium/support';

/**
 * Builds a short log prefix for a driver instance (e.g. `UiAutomator2@a1b2`).
 *
 * @param obj - Driver or other object; its constructor name and a short id are used.
 * @returns Prefix string like `DriverName@xxxx`, or `UnknownDriver@????` if `obj` is null.
 */
export function generateDriverLogPrefix(obj: object | null): string {
  if (!obj) {
    // This should not happen
    return 'UnknownDriver@????';
  }
  return `${obj.constructor.name}@${node.getObjectId(obj).substring(0, 4)}`;
}
