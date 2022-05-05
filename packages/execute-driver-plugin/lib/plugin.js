import BasePlugin from '@appium/base-plugin';
import _ from 'lodash';
import cp from 'child_process';
import {timing} from '@appium/support';
import B from 'bluebird';

const FEAT_FLAG = 'execute_driver_script';
const DEFAULT_SCRIPT_TIMEOUT_MS = 1000 * 60 * 60; // default to 1 hour timeout
const SCRIPT_TYPE_WDIO = 'webdriverio';

export default class ExecuteDriverPlugin extends BasePlugin {
  static newMethodMap = {
    '/session/:sessionId/appium/execute_driver': {
      POST: {
        command: 'executeDriverScript',
        payloadParams: {required: ['script'], optional: ['type', 'timeout']},
      },
    },
  };

  /**
   * This method takes a string which is executed as javascript in the context of
   * a new nodejs VM, and which has available a webdriverio driver object, having
   * already been attached to the currently running session.
   *
   * @param {function} next - standard behaviour for executeDriverScript
   * @param {BaseDriver} driver - Appium driver handling this command
   * @param {string} script - the string representing the driver script to run
   * @param {string} [scriptType='webdriverio'] - the name of the driver script
   * library (currently only webdriverio is supported)
   * @param {number} [timeoutMs=3600000] - timeout for the script process
   *
   * @returns {Object} - a JSONifiable object representing the return value of
   * the script
   */
  async executeDriverScript(
    next,
    driver,
    script,
    scriptType = 'webdriverio',
    timeoutMs = DEFAULT_SCRIPT_TIMEOUT_MS
  ) {
    if (!driver.isFeatureEnabled(FEAT_FLAG)) {
      throw new Error(
        `Execute driver script functionality is not available ` +
          `unless server is started with --allow-insecure including ` +
          `the '${FEAT_FLAG}' flag, e.g., --allow-insecure=${FEAT_FLAG}`
      );
    }

    if (scriptType !== SCRIPT_TYPE_WDIO) {
      throw new TypeError(
        `Only the '${SCRIPT_TYPE_WDIO}' script type is currently supported`
      );
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
      // Appium probably won't be behind ssl locally; if it ever is, might need to update this to
      // provide a user configurable parameter
      protocol: 'http',
      hostname: driver.serverHost,
      port: driver.serverPort,
      path: driver.serverPath,
      isW3C: true,
      isMobile: true,
      capabilities: driver.caps,
    };
    this.logger.info(
      `Constructed webdriverio driver options; W3C mode is ${
        driverOpts.isW3C ? 'on' : 'off'
      }`
    );

    // fork the execution script as a child process
    const childScript = require.resolve('./execute-child.js');
    this.logger.info(
      `Forking process to run webdriver script as child using ${childScript}`
    );
    const scriptProc = cp.fork(childScript);

    // keep track of whether we have canceled the script timeout, so we can stop
    // waiting for it and allow this process to finish gracefully
    let timeoutCanceled = false;

    try {
      const timer = new timing.Timer();
      timer.start();

      // promise that deals with the result from the child process
      const waitForResult = async () => {
        const res = await new B((res) => {
          scriptProc.on('message', res); // this is node IPC
        });

        this.logger.info(
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
        while (
          !timeoutCanceled &&
          timer.getDuration().asMilliSeconds < timeoutMs
        ) {
          await B.delay(500);
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
      this.logger.info('Sending driver and script data to child');
      scriptProc.send({driverOpts, script, timeoutMs});

      // and set up a race between the response from the child and the timeout
      return await B.race([waitForResult(), waitForTimeout()]);
    } catch (err) {
      throw new Error(
        `Could not execute driver script. Original error was: ${err}`
      );
    } finally {
      // ensure we always cancel the timeout so that the timeout promise stops
      // spinning and allows this process to die gracefully
      timeoutCanceled = true;

      if (scriptProc.connected) {
        this.logger.info('Disconnecting from child proc');
        scriptProc.disconnect();
      }

      if (scriptProc.exitCode === null) {
        this.logger.info(
          'Disconnecting from and killing driver script child proc'
        );
        scriptProc.kill();
      } else {
        this.logger.info('Script already ended on its own, no need to kill it');
      }
    }
  }
}

export {ExecuteDriverPlugin};
