import type {AppiumServer} from '@appium/types';
import {main as startAppium} from 'appium';
import type {Args, CliCommandServer} from 'appium/types';
import B from 'bluebird';
import type {Server} from 'node:http';
import stoppable from 'stoppable';
import type {Asyncify} from 'type-fest';

/**
 * Options for {@linkcode startStoppableAppium}
 */
export type AppiumServerOpts = Args<CliCommandServer>;

/**
 * An {@linkcode AppiumServer} with a method `stop() => Promise<void>`, which closes all sockets and fully stops the server.
 *
 * Returned by {@linkcode startStoppableAppium}
 */
export type TestAppiumServer = Omit<NormativeAppiumServer, 'close'> & {
  stop: Asyncify<stoppable.WithStop['stop']>;
  close: (callback: (err?: Error) => void) => Promise<void>;
};

/**
 * The {@linkcode AppiumServer} type, but with the `close` method normalized to a callback-style function.
 */
export type NormativeAppiumServer = Omit<AppiumServer, 'close'> & {
  close: Server['close'];
};

/**
 * Coerces {@linkcode AppiumServer} into a {@linkcode TestAppiumServer}.
 * @param opts Options for {@linkcode startAppium}
 * @todo This should be moved into `@appium/driver-test-support` or something
 * @returns A stoppable Appium server
 */
export async function startStoppableAppium(opts: AppiumServerOpts): Promise<TestAppiumServer> {
  const appiumServer = (await startAppium(opts)) as AppiumServer;
  const stoppableServer = stoppable(appiumServer as unknown as NormativeAppiumServer, 0);
  const originalAsyncClose = appiumServer.close;
  (stoppableServer as unknown as TestAppiumServer).close = async function (
    callback?: (err?: Error) => void
  ) {
    if (callback) {
      try {
        await originalAsyncClose.call(this);
        callback();
      } catch (err) {
        callback(err);
      }
    } else {
      await originalAsyncClose.call(this);
    }
  };
  stoppableServer.stop = B.promisify(stoppableServer.stop, {context: stoppableServer});
  return stoppableServer as unknown as TestAppiumServer;
}
