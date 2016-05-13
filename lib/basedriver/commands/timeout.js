import log from '../logger';
import { waitForCondition } from 'asyncbox';
import B from 'bluebird';
import { util } from 'appium-support';


let commands = {}, helpers = {}, extensions = {};

commands.timeouts = async function (type, duration) {
  let ms = parseInt(duration, 10);
  switch(type) {
    case 'command':
      this.newCommandTimeout(ms);
      break;
    case 'implicit':
      await this.implicitWait(ms);
      break;
    default:
      throw new Error(`Invalid timeout '${type}'`);
  }
};

commands.implicitWait = function (ms) {
  this.implicitWaitMs = parseInt(ms, 10);
  log.debug(`Set implicit wait to ${ms}ms`);
};

helpers.newCommandTimeout = function (ms) {
  this.newCommandTimeoutMs = ms;
  log.debug(`Set new command timeout to ${ms}ms`);
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
  if(!this.newCommandTimeoutMs) return;

  this.noCommandTimer = util.cancellableDelay(this.newCommandTimeoutMs);
  this.noCommandTimer
    .then(async () => {
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
  let wrappedCondFn = async function (...args) {
    // reset command timeout
    this.clearNewCommandTimeout();

    return await condFn(...args);
  }.bind(this); // TODO: fix jshint and use an arrow function
  return await waitForCondition(wrappedCondFn, {
    waitMs: this.implicitWaitMs, intervalMs: 500, logger: log
  });
};

Object.assign(extensions, commands, helpers);
export { commands, helpers };
export default extensions;
