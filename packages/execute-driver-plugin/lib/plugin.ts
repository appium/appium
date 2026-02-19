import {BasePlugin} from 'appium/plugin';
import _ from 'lodash';
import cp from 'node:child_process';
import {timing} from 'appium/support';
import type {ExternalDriver, NextPluginCallback, MethodMap, PluginCommand} from '@appium/types';

const FEAT_FLAG = 'execute_driver_script';
const DEFAULT_SCRIPT_TIMEOUT_MS = 1000 * 60 * 60; // default to 1 hour timeout
const SCRIPT_TYPE_WDIO = 'webdriverio';

export class ExecuteDriverPlugin extends BasePlugin {
  static newMethodMap: MethodMap<ExecuteDriverPlugin> = {
    '/session/:sessionId/appium/execute_driver': {
      POST: {
        command: 'executeDriverScript',
        payloadParams: {required: ['script'], optional: ['type', 'timeout']},
      },
    },
  } as const;

  /**
   * This method takes a string which is executed as javascript in the context of
   * a new nodejs VM, and which has available a webdriverio driver object, having
   * already been attached to the currently running session.
   *
   * @param next - standard behaviour for executeDriverScript
   * @param driver - Appium driver handling this command
   * @param script - the string representing the driver script to run
   * @param scriptType - the name of the driver script library (currently only webdriverio is supported). Defaults to `'webdriverio'`.
   * @param timeoutMs - timeout for the script process. Defaults to `3600000`.
   * @returns a JSONifiable object representing the return value of the script
   * @throws {Error}
   */
  executeDriverScript: PluginCommand<
    ExternalDriver,
    [script: string, scriptType?: string, timeoutMs?: number],
    any
  > = async (
    next: NextPluginCallback,
    driver: ExternalDriver,
    script: string,
    scriptType: string = 'webdriverio',
    timeoutMs: number = DEFAULT_SCRIPT_TIMEOUT_MS
  ) => {
    if (!driver.isFeatureEnabled(FEAT_FLAG)) {
      throw new Error(
        `Execute driver script functionality is not available ` +
          `unless server is started with --allow-insecure including ` +
          `the '${FEAT_FLAG}' flag, e.g., ` +
          `--allow-insecure=${driver.opts.automationName ?? '*'}:${FEAT_FLAG}`
      );
    }

    if (scriptType !== SCRIPT_TYPE_WDIO) {
      throw new TypeError(`Only the '${SCRIPT_TYPE_WDIO}' script type is currently supported`);
    }

    if (!driver.serverHost || !driver.serverPort) {
      throw new Error(
        'Address or port of running server were not defined; this ' +
          'is required. This is probably a programming error in the driver'
      );
    }

    if (!_.isNumber(timeoutMs)) {
      throw new TypeError('Timeout parameter must be a number');
    }

    const driverOpts = {
      sessionId: driver.sessionId,
      options: {
        // Appium probably won't be behind ssl locally; if it ever is, might need to update this to
        // provide a user configurable parameter
        protocol: 'http',
        hostname: driver.serverHost,
        port: driver.serverPort,
        path: driver.serverPath,
      },
      isW3C: true,
      isMobile: true,
      capabilities: driver.caps,
    };
    this.log.info(
      `Constructed webdriverio driver options; W3C mode is ${driverOpts.isW3C ? 'on' : 'off'}`
    );

    // fork the execution script as a child process
    const childScript = require.resolve('./execute-child.js');
    this.log.info(`Forking process to run webdriver script as child using ${childScript}`);
    const scriptProc = cp.fork(childScript);

    // keep track of whether we have canceled the script timeout, so we can stop
    // waiting for it and allow this process to finish gracefully
    let timeoutCanceled = false;

    try {
      const timer = new timing.Timer();
      timer.start();

      // promise that deals with the result from the child process
      const waitForResult = async () => {
        const res = await new Promise<{error?: {message: string}; success?: any}>((resolve) => {
          scriptProc.on('message', resolve); // this is node IPC
        });

        this.log.info(
          'Received execute driver script result from child process, shutting it down'
        );

        if (res.error) {
          throw new Error(res.error.message);
        }

        return res.success;
      };

      // promise that waits up to the timeout and throws an error if so, or does
      // nothing if the timeout is canceled because we got a result from the
      // child script
      const waitForTimeout = async () => {
        while (!timeoutCanceled && timer.getDuration().asMilliSeconds < timeoutMs) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }

        if (timeoutCanceled) {
          return;
        }

        throw new Error(
          `Execute driver script timed out after ${timeoutMs}ms. ` +
            `You can adjust this with the 'timeout' parameter.`
        );
      };

      // now that the child script is alive, send it the data it needs to start
      // running the driver script
      this.log.info('Sending driver and script data to child');
      scriptProc.send({driverOpts, script, timeoutMs});

      // and set up a race between the response from the child and the timeout
      return await Promise.race([waitForResult(), waitForTimeout()]);
    } catch (err: any) {
      throw new Error(`Could not execute driver script. Original error was: ${err}`);
    } finally {
      // ensure we always cancel the timeout so that the timeout promise stops
      // spinning and allows this process to die gracefully
      timeoutCanceled = true;

      if (scriptProc.connected) {
        this.log.info('Disconnecting from child proc');
        scriptProc.disconnect();
      }

      if (scriptProc.exitCode === null) {
        this.log.info('Disconnecting from and killing driver script child proc');
        scriptProc.kill();
      } else {
        this.log.info('Script already ended on its own, no need to kill it');
      }
    }
  };
}
