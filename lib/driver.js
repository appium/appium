import { MobileJsonWireProtocol,
         errors } from 'mobile-json-wire-protocol';
import commands from './commands';
import log from 'appium-logger';
import B from 'bluebird';
import _ from 'lodash';

class BaseDriver extends MobileJsonWireProtocol {

  constructor () {
    super();
    this.sessionId = null;
    this.caps = null;
    this.curCommand = new B((r) => { r(); }); // see note in execute
    this.noCommandTimer = null;
    this.newCommandTimeoutMs = null;
  }

  // method required by MJSONWP in order to determine whether it should
  // respond with an invalid session response
  sessionExists (sessionId) {
    if (!sessionId) return false;
    return sessionId === this.sessionId;
  }

  validateDesiredCaps (caps) {
    return !!caps;
  }

  // This is the main command handler for the driver. It wraps command
  // execution with timeout logic, checking that we have a valid session,
  // and ensuring that we execute commands one at a time. This method is called
  // by MJSONWP's express router.
  async execute (cmd, ...args) {
    // if we had a command timer running, clear it now that we're starting
    // a new command and so don't want to time out
    if (this.noCommandTimer) {
      clearTimeout(this.noCommandTimer);
    }

    // if we don't have this command, it must not be implemented
    if (!this[cmd]) {
      throw new errors.NotYetImplementedError();
    }

    // What we're doing here is pretty clever. this.curCommand is always
    // a promise representing the command currently being executed by the
    // driver, or the last command executed by the driver (it starts off as
    // essentially a pre-resolved promise). When a command comes in, we tack it
    // to the end of this.curCommand, essentially saying we want to execute it
    // whenever this.curCommand is done. We call this new promise nextCommand,
    // and its resolution is what we ultimately will return to whomever called
    // us. Meanwhile, we reset this.curCommand to _be_ nextCommand (but
    // ignoring any rejections), so that if another command comes into the
    // server, it gets tacked on to the end of nextCommand. Thus we create
    // a chain of promises that acts as a queue with single concurrency.
    let nextCommand = this.curCommand.then(() => {
      return this[cmd](...args);
    });
    this.curCommand = nextCommand.catch(() => {});
    let res = await nextCommand;

    // if we have set a new command timeout (which is the default), start a
    // timer once we've finished executing this command. If we don't clear
    // the timer (which is done when a new command comes in), we will trigger
    // automatic session deletion in this.onCommandTimeout
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
