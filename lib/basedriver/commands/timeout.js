import log from '../logger';
import { waitForCondition } from 'asyncbox';
import B from 'bluebird';
import _ from 'lodash';
import { util } from 'appium-support';
import { errors } from '../../mjsonwp';


let commands = {}, helpers = {}, extensions = {};

const MIN_TIMEOUT = 0;

commands.timeouts = async function (type, duration) {
  let ms = this.parseTimeoutArgument(duration);
  switch (type) {
    case 'command':
      this.setNewCommandTimeout(ms);
      break;
    case 'implicit':
      this.setImplicitWait(ms);
      break;
    default:
      throw new Error(`Invalid timeout '${type}'`);
  }
};

commands.implicitWait = async function (ms) {
  this.setImplicitWait(this.parseTimeoutArgument(ms));
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
