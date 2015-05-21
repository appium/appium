import { MobileJsonWireProtocol,
         errors,
         NO_SESSION_ID_COMMANDS } from 'mobile-json-wire-protocol';
import commands from './commands';
import log from 'appium-logger';
import B from 'bluebird';
import _ from 'lodash';

class BaseDriver extends MobileJsonWireProtocol {

  constructor () {
    super();
    this.sessionId = null;
    this.caps = null;
    this.lastCommand = B.delay(0);
    this.noCommandTimer = null;
    this.newCommandTimeoutMs = null;
  }

  sessionExists (sessionId) {
    if (!sessionId) return false;
    return sessionId === this.sessionId;
  }

  validateDesiredCaps (caps) {
    return !!caps;
  }

  async execute (cmd, ...args) {
    if (this.noCommandTimer) {
      clearTimeout(this.noCommandTimer);
    }
    if (!this.sessionId && !_.contains(NO_SESSION_ID_COMMANDS, cmd)) {
      throw new errors.NoSuchDriverError();
    }

    if (!this[cmd]) {
      throw new errors.NotYetImplementedError();
    }

    let eventuallyCommand = this.lastCommand.then(() => {
      return this[cmd](...args);
    });
    this.lastCommand = eventuallyCommand.catch(() => {});
    let res = await eventuallyCommand;
    if (this.newCommandTimeoutMs !== null) {
      this.noCommandTimer = setTimeout(this.onCommandTimeout.bind(this),
                                       this.newCommandTimeoutMs);
    }
    return res;
  }

  async onCommandTimeout () {
    log.warn(`Shutting down because we waited ` +
             `${this.newCommandTimeoutMs / 1000} seconds for a command`);
    await this.deleteSession();
  }

}

for (let [cmd, fn] of _.pairs(commands)) {
  BaseDriver.prototype[cmd] = fn;
}

export { BaseDriver };
