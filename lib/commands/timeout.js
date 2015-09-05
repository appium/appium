import log from '../logger';
import { waitForCondition } from 'asyncbox';
import B from 'bluebird';

let commands = {}, helpers = {}, extensions = {};

commands.implicitWait = function (ms) {
  this.implicitWaitMs = parseInt(ms, 10);
  log.debug(`Set implicit wait to ${ms}ms`);
};

commands.timeouts = async function (name, duration) {
  if (name === 'command') {
    this.newCommandTimeoutMs = duration;
  }
};

helpers.clearNewCommandTimeout = function () {
  if (this.noCommandTimer) {
    clearTimeout(this.noCommandTimer);
    this.noCommandTimer = null;
  }
};

helpers.startNewCommandTimeout = function (cmd) {
  // make sure there are no rogue timeouts
  this.clearNewCommandTimeout();

  // if command timeout is 0, it is disabled
  if(!this.newCommandTimeoutMs) return;

  //  TODO: replace setTimeout by CancellableDelay
  this.noCommandTimer = setTimeout(() => {
    let onCommand = async () => {
      log.warn(`Shutting down because we waited ` +
               `${this.newCommandTimeoutMs / 1000} seconds for a command`);
      await this.startUnexpectedShutdown(new Error(`Command ${cmd} timed out!`));
    };
    B.resolve(onCommand()).done();
  }, this.newCommandTimeoutMs);
};

helpers.implicitWaitForCondition = async function (condFn) {
  log.debug(`Waiting up to ${this.implicitWaitMs} ms for condition`);
  let wrappedCondFn = async function (...args) {
    // reset command timeout
    // TODO: can we do better than that?
    this.clearNewCommandTimeout();

    return await condFn(...args);
  }.bind(this); // TODO: fix jshint and use an arrow function
  return await waitForCondition(wrappedCondFn, {
    waitMs: this.implicitWaitMs, intervalMs: 500, logger: log
  });
};

Object.assign(extensions, commands, helpers);
export { commands, helpers};
export default extensions;
