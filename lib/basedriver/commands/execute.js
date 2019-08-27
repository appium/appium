import _ from 'lodash';
import path from 'path';
import cp from 'child_process';
import log from '../logger';
import B from 'bluebird';

const FEAT_FLAG = 'execute_driver_script';
const DEFAULT_SCRIPT_TIMEOUT = 1000 * 60 * 60; // default to 1 hour timeout
const SCRIPT_TYPE_WDIO = 'webdriverio';
// TODO add wd script type at some point

let commands = {};

/**
 * This method takes a string which is executed as javascript in the context of
 * a new nodejs VM, and which has available a webdriverio driver object, having
 * already been attached to the currently running session.
 *
 * @param {string} script - the string representing the driver script to run
 * @param {string} [scriptType='webdriverio'] - the name of the driver script
 * library (currently only webdriverio is supported)
 *
 * @returns {Object} - a JSONifiable object representing the return value of
 * the script
 */
commands.executeDriverScript = async function (script, scriptType = 'webdriverio',
  timeout = DEFAULT_SCRIPT_TIMEOUT) {

  if (!this.isFeatureEnabled(FEAT_FLAG)) {
    throw new Error(`Execute driver script functionality is not available ` +
                    `unless server is started with --allow-insecure including ` +
                    `the '${FEAT_FLAG}' flag, e.g., --allow-insecure=${FEAT_FLAG}`);
  }

  if (scriptType !== SCRIPT_TYPE_WDIO) {
    throw new Error(`Only the '${SCRIPT_TYPE_WDIO}' script type is currently supported`);
  }

  if (!this.opts.address || !this.opts.port) {
    throw new Error('Address or port of running server were not defined; this ' +
                    'is required. This is probably a programming error in the driver');
  }

  if (!_.isNumber(timeout)) {
    throw new Error('Timeout parameter must be a number');
  }

  const driverOpts = {
    sessionId: this.sessionId,
    protocol: 'http', // Appium won't ever be behind ssl locally
    hostname: this.opts.address,
    port: this.opts.port,
    path: this.basePath,
    isW3C: this.isW3CProtocol(),
    isMobile: true,
    capabilities: this.caps
  };
  log.info(`Constructed webdriverio driver options; W3C mode is ${driverOpts.isW3C ? 'on' : 'off'}`);


  // fork the execution script as a child process
  const childScript = path.join(__dirname, 'execute-child.js');
  log.info(`Forking process to run webdriver script as child using ${childScript}`);
  const scriptProc = cp.fork(childScript);

  // keep track of whether we have canceled the script timeout, so we can stop
  // waiting for it and allow this process to finish gracefully
  let timeoutCanceled = false;

  try {
    const timeoutStart = Date.now();

    // promise that deals with the result from the child process
    const waitForResult = async function () {
      const resPromise = new B((res) => {
        scriptProc.on('message', res); // this is node IPC
      });

      const res = await resPromise;
      log.info('Received execute driver script result from child process, shutting it down');

      if (res.error) {
        throw new Error(res.error.message);
      }

      return res.success;
    };

    // promise that waits up to the timeout and throws an error if so, or does
    // nothing if the timeout is canceled because we got a result from the
    // child script
    const waitForTimeout = async function () {
      while (!timeoutCanceled && (Date.now() - timeoutStart) < timeout) {
        await B.delay(500);
      }

      if (timeoutCanceled) {
        return;
      }

      throw new Error(`Execute driver script timed out after ${timeout}ms. ` +
                      `You can adjust this with the 'timeout' parameter.`);
    };

    // now that the child script is alive, send it the data it needs to start
    // running the driver script
    log.info('Sending driver and script data to child');
    scriptProc.send({driverOpts, script, timeout});

    // and set up a race between the response from the child and the timeout
    return await B.race([waitForResult(), waitForTimeout()]);
  } catch (err) {
    throw new Error(`Could not execute driver script. Original error was: ${err}`);
  } finally {
    // ensure we always cancel the timeout so that the timeout promise stops
    // spinning and allows this process to die gracefully
    timeoutCanceled = true;

    log.info('Disconnecting from and killing driver script child proc');
    scriptProc.disconnect();
    scriptProc.kill();
  }
};


export default commands;
