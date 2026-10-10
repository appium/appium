import type {Driver} from '@appium/types';

type TimeoutDriver = Pick<
  Driver,
  'clearNewCommandTimeout' | 'startNewCommandTimeout' | 'isCommandsQueueEnabled' | 'sessionId'
> & {shutdownUnexpectedly?: boolean};

interface CommandActivity {
  count: number;
  restoreTimeout: () => void;
}

// Drivers installed in APPIUM_HOME may load another copy of base-driver. Share activity
// counts so their HTTP commands and the server's plugin/BiDi wrappers protect each other.
const STORE_KEY = Symbol.for('@appium/base-driver:command-activity');
const stores = globalThis as typeof globalThis & {[STORE_KEY]?: WeakMap<object, CommandActivity>};
const activeCommands = (stores[STORE_KEY] ??= new WeakMap<object, CommandActivity>());

/** Whether a driver has commands or plugin handlers still in flight. */
export function hasRunningCommands(driver: object): boolean {
  return (activeCommands.get(driver)?.count ?? 0) > 0;
}

/** Suspend the idle timer until the last overlapping command or plugin handler finishes. */
export async function runWithCommandTimeout<T>(
  driver: TimeoutDriver,
  command: () => Promise<T>,
  {restart = true}: {restart?: boolean | (() => boolean)} = {},
): Promise<T> {
  let activity = activeCommands.get(driver);
  if (!activity) {
    activity = {count: 0, restoreTimeout: guardTimeoutRestart(driver)};
    activeCommands.set(driver, activity);
  }
  activity.count++;
  try {
    await driver.clearNewCommandTimeout();
    return await command();
  } finally {
    if (--activity.count === 0) {
      activeCommands.delete(driver);
      activity.restoreTimeout();
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

function guardTimeoutRestart(driver: TimeoutDriver): () => void {
  const ownDescriptor = Object.getOwnPropertyDescriptor(driver, 'startNewCommandTimeout');
  const startTimeout = driver.startNewCommandTimeout;
  // Older installed drivers cannot see the shared counter. Intercept their attempts to
  // rearm expiry until the outer plugin/BiDi work completes, then restore their method.
  Object.defineProperty(driver, 'startNewCommandTimeout', {
    configurable: true,
    enumerable: ownDescriptor?.enumerable ?? false,
    writable: true,
    value: async () => {
      if (!hasRunningCommands(driver)) {
        await startTimeout.call(driver);
      }
    },
  });
  return () => {
    if (ownDescriptor) {
      Object.defineProperty(driver, 'startNewCommandTimeout', ownDescriptor);
    } else {
      Reflect.deleteProperty(driver, 'startNewCommandTimeout');
    }
  };
}
