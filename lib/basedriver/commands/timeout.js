import log from '../logger';
import { waitForCondition } from 'asyncbox';
import B from 'bluebird';
import _ from 'lodash';
import { util } from 'appium-support';
import { errors } from '../../protocol';
import BaseDriver from "../driver";


let commands = {}, helpers = {}, extensions = {};

const MIN_TIMEOUT = 0;

// If we define `commands.timeouts` instead of `commands.timeoutsW3C`, the command `timeouts` will be called
// from other dirver's timeouts. See https://github.com/appium/appium-base-driver/pull/164
// Arguments will be: [{"protocol":"W3C","implicit":30000}, "1dcfe021-8fc8-49bd-8dac-e986d3091b97", ...]
// eslint-disable-next-line no-unused-vars
commands.timeouts = async function (timeoutsObj) {
  if (timeoutsObj.protocol === BaseDriver.DRIVER_PROTOCOL.W3C) {
    const {script, pageLoad, implicit} = timeoutsObj;
    log.debug(`script: ${script}, pageLoad: ${pageLoad}, implicit: ${implicit}`);

    if (util.hasValue(script)) {
      await this.scriptTimeoutW3C(script);
    }

    if (util.hasValue(pageLoad)) {
      await this.pageLoadTimeoutW3C(pageLoad);
    }

    if (util.hasValue(implicit)) {
      await this.implicitWaitW3C(implicit);
    }
  } else {
    const {type, ms} = timeoutsObj;
    log.debug(`type: ${type}, ms: ${ms}`);

    switch (type) {
      case 'command':
        await this.newCommandTimeout(ms);
        break;
      case 'implicit':
        await this.implicitWaitMJSONWP(ms);
        break;
      case 'page load':
        await this.pageLoadTimeoutMJSONWP(ms);
        break;
      case 'script':
        await this.scriptTimeoutMJSONWP(ms);
        break;
      default:
        throw new Error(`'${type}' is not supported`);
    }
  }
};

commands.getTimeouts = async function () {
  return {
    command: this.newCommandTimeoutMs,
    implicit: this.implicitWaitMs,
  };
};

// implicit
commands.implicitWaitW3C = async function (ms) {
  await this.implicitWait(ms);
};

commands.implicitWaitMJSONWP = async function (ms) {
  await this.implicitWait(ms);
};

commands.implicitWait = async function (ms) {
  await this.setImplicitWait(this.parseTimeoutArgument(ms));
};

helpers.setImplicitWait = function (ms) {
  this.implicitWaitMs = ms;
  log.debug(`Set implicit wait to ${ms}ms`);
  if (this.managedDrivers && this.managedDrivers.length) {
    log.debug('Setting implicit wait on managed drivers');
    for (let driver of this.managedDrivers) {
      if (_.isFunction(driver.setImplicitWait)) {
        driver.setImplicitWait(ms);
      }
    }
  }
};

// pageLoad
// eslint-disable-next-line no-unused-vars
commands.pageLoadTimeoutW3C = async function (ms) {
  throw new errors.NotImplementedError('Not implemented yet for pageLoad.');
};

// eslint-disable-next-line no-unused-vars
commands.pageLoadTimeoutMJSONWP = async function (ms) {
  throw new errors.NotImplementedError('Not implemented yet for pageLoad.');
};

// script
// eslint-disable-next-line no-unused-vars
commands.scriptTimeoutW3C = async function (ms) {
  throw new errors.NotImplementedError('Not implemented yet for script.');
};

// eslint-disable-next-line no-unused-vars
commands.scriptTimeoutMJSONWP = async function (ms) {
  throw new errors.NotImplementedError('Not implemented yet for script.');
};

// command
commands.newCommandTimeout = async function (ms) {
  this.setNewCommandTimeout(this.parseTimeoutArgument(ms));
};

helpers.setNewCommandTimeout = function (ms) {
  this.newCommandTimeoutMs = ms;
  log.debug(`Set new command timeout to ${ms}ms`);
  if (this.managedDrivers && this.managedDrivers.length) {
    log.debug('Setting new command timeout on managed drivers');
    for (let driver of this.managedDrivers) {
      if (_.isFunction(driver.setNewCommandTimeout)) {
        driver.setNewCommandTimeout(ms);
      }
    }
  }
};

helpers.clearNewCommandTimeout = function () {
  if (this.noCommandTimer) {
    this.noCommandTimer.cancel();
    this.noCommandTimer = null;
  }
};

helpers.startNewCommandTimeout = function () {
  // make sure there are no rogue timeouts
  this.clearNewCommandTimeout();

  // if command timeout is 0, it is disabled
  if (!this.newCommandTimeoutMs) return; // eslint-disable-line curly

  this.noCommandTimer = util.cancellableDelay(this.newCommandTimeoutMs);
  this.noCommandTimer
    .then(async () => { // eslint-disable-line promise/prefer-await-to-then
      log.warn(`Shutting down because we waited ` +
               `${this.newCommandTimeoutMs / 1000} seconds for a command`);
      let errorMessage = `New Command Timeout of ` +
               `${this.newCommandTimeoutMs / 1000} seconds ` +
               `expired. Try customizing the timeout using the ` +
               `'newCommandTimeout' desired capability`;
      await this.startUnexpectedShutdown(new Error(errorMessage));
    })
    .catch(B.CancellationError, (/*err*/) => {
      // ignore
    });
};

helpers.implicitWaitForCondition = async function (condFn) {
  log.debug(`Waiting up to ${this.implicitWaitMs} ms for condition`);
  let wrappedCondFn = async (...args) => {
    // reset command timeout
    this.clearNewCommandTimeout();

    return await condFn(...args);
  };
  return await waitForCondition(wrappedCondFn, {
    waitMs: this.implicitWaitMs, intervalMs: 500, logger: log
  });
};

helpers.parseTimeoutArgument = function (ms) {
  let duration = parseInt(ms, 10);
  if (_.isNaN(duration) || duration < MIN_TIMEOUT) {
    throw new errors.UnknownError(`Invalid timeout value '${ms}'`);
  }
  return duration;
};

Object.assign(extensions, commands, helpers);
export { commands, helpers };
export default extensions;
