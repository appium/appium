import log from '../logger';
import { waitForCondition } from 'asyncbox';
import B from 'bluebird';
import _ from 'lodash';
import { util } from 'appium-support';
import { errors } from '../../protocol';


let commands = {}, helpers = {}, extensions = {};

const MIN_TIMEOUT = 0;

commands.timeouts = async function timeouts (type, ms, script, pageLoad, implicit) {
  if (util.hasValue(type) && util.hasValue(ms)) {
    log.debug(`MJSONWP timeout arguments: ${JSON.stringify({type, ms})}}`);

    switch (type) {
      case 'command':
        await this.newCommandTimeout(ms);
        return;
      case 'implicit':
        await this.implicitWaitMJSONWP(ms);
        return;
      case 'page load':
        await this.pageLoadTimeoutMJSONWP(ms);
        return;
      case 'script':
        await this.scriptTimeoutMJSONWP(ms);
        return;
      default:
        throw new Error(`'${type}' type is not supported for MJSONWP timeout`);
    }
  }

  // Otherwise assume it is W3C protocol
  log.debug(`W3C timeout argument: ${JSON.stringify({script, pageLoad, implicit})}}`);
  if (util.hasValue(script)) {
    await this.scriptTimeoutW3C(script);
  }
  if (util.hasValue(pageLoad)) {
    await this.pageLoadTimeoutW3C(pageLoad);
  }
  if (util.hasValue(implicit)) {
    await this.implicitWaitW3C(implicit);
  }
};

commands.getTimeouts = async function getTimeouts () { // eslint-disable-line require-await
  return {
    command: this.newCommandTimeoutMs,
    implicit: this.implicitWaitMs,
  };
};

// implicit
commands.implicitWaitW3C = async function implicitWaitW3C (ms) {
  await this.implicitWait(ms);
};

commands.implicitWaitMJSONWP = async function implicitWaitMJSONWP (ms) {
  await this.implicitWait(ms);
};

commands.implicitWait = async function implicitWait (ms) {
  await this.setImplicitWait(this.parseTimeoutArgument(ms));
};

helpers.setImplicitWait = function setImplicitWait (ms) { // eslint-disable-line require-await
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
commands.pageLoadTimeoutW3C = async function pageLoadTimeoutW3C (ms) { // eslint-disable-line require-await
  throw new errors.NotImplementedError('Not implemented yet for pageLoad.');
};

// eslint-disable-next-line no-unused-vars
commands.pageLoadTimeoutMJSONWP = async function pageLoadTimeoutMJSONWP (ms) { // eslint-disable-line require-await
  throw new errors.NotImplementedError('Not implemented yet for pageLoad.');
};

// script
// eslint-disable-next-line no-unused-vars
commands.scriptTimeoutW3C = async function scriptTimeoutW3C (ms) { // eslint-disable-line require-await
  throw new errors.NotImplementedError('Not implemented yet for script.');
};

// eslint-disable-next-line no-unused-vars
commands.scriptTimeoutMJSONWP = async function scriptTimeoutMJSONWP (ms) { // eslint-disable-line require-await
  throw new errors.NotImplementedError('Not implemented yet for script.');
};

// command
commands.newCommandTimeout = async function newCommandTimeout (ms) { // eslint-disable-line require-await
  this.setNewCommandTimeout(this.parseTimeoutArgument(ms));
};

helpers.setNewCommandTimeout = function setNewCommandTimeout (ms) {
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

helpers.clearNewCommandTimeout = function clearNewCommandTimeout () {
  if (this.noCommandTimer) {
    this.noCommandTimer.cancel();
    this.noCommandTimer = null;
  }
};

helpers.startNewCommandTimeout = function startNewCommandTimeout () {
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

helpers.implicitWaitForCondition = async function implicitWaitForCondition (condFn) {
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

helpers.parseTimeoutArgument = function parseTimeoutArgument (ms) {
  let duration = parseInt(ms, 10);
  if (_.isNaN(duration) || duration < MIN_TIMEOUT) {
    throw new errors.UnknownError(`Invalid timeout value '${ms}'`);
  }
  return duration;
};

Object.assign(extensions, commands, helpers);
export { commands, helpers };
export default extensions;
