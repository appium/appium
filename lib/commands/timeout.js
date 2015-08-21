import log from '../logger';
import { waitForCondition } from 'asyncbox';

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

commands.implicitWaitForCondition = async function (condFn) {
  log.debug(`Waiting up to ${this.implicitWaitMs} ms for condition`);
  let wrappedCondFn = async function (...args) {
    // reset command timeout
    // TODO: can we do better than that?
    if (this.noCommandTimer) {
      clearTimeout(this.noCommandTimer);
    }
    return await condFn(...args);
  }.bind(this); // TODO: fix jshint and use an arrow function
  return await waitForCondition(wrappedCondFn, {
    waitMs: this.implicitWaitMs, intervalMs: 500, logger: log
  });
};

Object.assign(extensions, commands, helpers);
export { commands, helpers};
export default extensions;
