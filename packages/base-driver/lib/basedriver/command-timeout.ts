import type {Driver} from '@appium/types';

type TimeoutDriver = Pick<
  Driver,
  'clearNewCommandTimeout' | 'startNewCommandTimeout' | 'isCommandsQueueEnabled' | 'sessionId'
> & {shutdownUnexpectedly?: boolean};

// Drivers installed in APPIUM_HOME may load another copy of base-driver. Share activity
// tokens so their HTTP commands and the server's plugin/BiDi wrappers protect each other.
const STORE_KEY = Symbol.for('@appium/base-driver:command-activity');
const stores = globalThis as typeof globalThis & {[STORE_KEY]?: WeakMap<object, Set<symbol>>};
const activeCommands = (stores[STORE_KEY] ??= new WeakMap<object, Set<symbol>>());

/** Whether a driver has commands or plugin handlers still in flight. */
export function hasRunningCommands(driver: object): boolean {
  return (activeCommands.get(driver)?.size ?? 0) > 0;
}

/**
 * Suspend the idle timer until the last overlapping command or plugin handler finishes.
 * Requires a driver whose startNewCommandTimeout honors shared command activity, as BaseDriver does.
 */
export async function runWithCommandTimeout<T>(
  driver: TimeoutDriver,
  command: () => Promise<T>,
  {restart = true}: {restart?: boolean | (() => boolean)} = {},
): Promise<T> {
  let activity = activeCommands.get(driver);
  if (!activity) {
    activity = new Set();
    activeCommands.set(driver, activity);
  }
  const token = Symbol();
  activity.add(token);
  try {
    await driver.clearNewCommandTimeout();
    return await command();
  } finally {
    activity.delete(token);
    if (activity.size === 0) {
      activeCommands.delete(driver);
      if (
        (typeof restart === 'function' ? restart() : restart) &&
        Boolean(driver.sessionId) &&
        !driver.shutdownUnexpectedly &&
        driver.isCommandsQueueEnabled
      ) {
        await driver.startNewCommandTimeout();
      }
    }
  }
}
