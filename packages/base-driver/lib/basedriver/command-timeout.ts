import type {Driver} from '@appium/types';

type TimeoutDriver = Pick<
  Driver,
  'clearNewCommandTimeout' | 'startNewCommandTimeout' | 'isCommandsQueueEnabled' | 'sessionId'
> & {shutdownUnexpectedly?: boolean};

// Drivers installed in APPIUM_HOME may load another copy of base-driver. Share activity
// counts so their HTTP commands and the server's plugin/BiDi wrappers protect each other.
const STORE_KEY = Symbol.for('@appium/base-driver:command-activity');
const stores = globalThis as typeof globalThis & {[STORE_KEY]?: WeakMap<object, number>};
const activeCommands = (stores[STORE_KEY] ??= new WeakMap<object, number>());

/** Whether a driver has commands or plugin handlers still in flight. */
export function hasRunningCommands(driver: object): boolean {
  return (activeCommands.get(driver) ?? 0) > 0;
}

/** Suspend the idle timer until the last overlapping command or plugin handler finishes. */
export async function runWithCommandTimeout<T>(
  driver: TimeoutDriver,
  command: () => Promise<T>,
  {restart = true}: {restart?: boolean | (() => boolean)} = {},
): Promise<T> {
  activeCommands.set(driver, (activeCommands.get(driver) ?? 0) + 1);
  try {
    await driver.clearNewCommandTimeout();
    return await command();
  } finally {
    const remaining = (activeCommands.get(driver) ?? 1) - 1;
    if (remaining) {
      activeCommands.set(driver, remaining);
    } else {
      activeCommands.delete(driver);
      if (
        (typeof restart === 'function' ? restart() : restart) &&
        driver.sessionId !== null &&
        !driver.shutdownUnexpectedly &&
        driver.isCommandsQueueEnabled
      ) {
        await driver.startNewCommandTimeout();
      }
    }
  }
}
