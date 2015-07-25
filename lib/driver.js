import { MobileJsonWireProtocol,
         errors } from 'mobile-json-wire-protocol';
import os from 'os';
import commands from './commands';
import helpers from './helpers';
import log from './logger';
import { desiredCapabilityConstraints, validator } from './desired-caps';
import B from 'bluebird';
import _ from 'lodash';

validator.promise = B;
validator.prettify = (val) => { return val; };

const NEW_COMMAND_TIMEOUT_MS = 60 * 1000;

class BaseDriver extends MobileJsonWireProtocol {

  constructor (opts = {}, shouldValidateCaps = true) {
    super();
    this.sessionId = null;
    this.opts = opts;
    this.caps = null;
    this.helpers = helpers;
    this.newCommandTimeoutMs = NEW_COMMAND_TIMEOUT_MS;
    this._constraints = _.cloneDeep(desiredCapabilityConstraints);

    // use a custom tmp dir to avoid losing data and app when computer is
    // restarted
    this.opts.tmpDir = this.opts.tmpDir ||
                       process.env.APPIUM_TMP_DIR ||
                       os.tmpDir();

    // base-driver internals
    this.curCommand = new B((r) => { r(); }); // see note in execute
    this.curCommandCancellable = new B((r) => { r(); }); // see note in execute
    this.onUnexpectedShutdown = new B(() => {}).cancellable();
    // handle this ourselves so we don't get a stacktrace printed out
    this.onUnexpectedShutdown.catch(() => {});
    this.shutdownUnexpectedly = false;
    this.noCommandTimer = null;
    this.shouldValidateCaps = shouldValidateCaps;
  }

  // we only want subclasses to ever extend the contraints
  set desiredCapConstraints (constraints) {
    this._constraints = Object.assign(this._constraints, constraints);
  }

  get desiredCapConstraints () {
    return this._constraints;
  }

  // method required by MJSONWP in order to determine whether it should
  // respond with an invalid session response
  sessionExists (sessionId) {
    if (!sessionId) return false;
    return sessionId === this.sessionId;
  }

  logExtraCaps (caps) {
    let extraCaps = _.difference(_.keys(caps),
                                 _.keys(this._constraints));
    if (extraCaps.length) {
      log.warn(`The following capabilities were provided, but are not ` +
               `recognized by appium: ${extraCaps.join(', ')}.`);
    }
  }

  validateDesiredCaps (caps) {
    if (!this.shouldValidateCaps) {
      return true;
    }

    let validationOptions = {fullMessages: false};
    let validationErrors = validator.validate(caps,
                                              this._constraints,
                                              validationOptions);

    if (validationErrors) {
      let message = `The desiredCapabilities object was not valid for the ` +
                    `following reason(s):`;
      for (let [attribute, reasons] of _.pairs(validationErrors)) {
        for (let reason of reasons) {
          message += ` ${attribute} ${reason},`;
        }
      }
      message = message.slice(0, -1) + '.';
      throw new errors.SessionNotCreatedError(message);
    }

    this.logExtraCaps(caps);

    return true;
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
      // if we unexpectedly shut down, we need to reject every command in
      // the queue before we actually try to run it
      if (this.shutdownUnexpectedly) {
        return B.reject(new Error("The driver shut down unexpectedly"));
      }
      // We also need to turn the command into a cancellable promise so if we
      // have an unexpected shutdown event, for example, we can cancel it from
      // outside, rejecting the current command immediately
      this.curCommandCancellable = new B((r) => { r(); }).then(() => {
        return this[cmd](...args);
      }).cancellable();
      return this.curCommandCancellable;
    });
    this.curCommand = nextCommand.catch(() => {});
    let res = await nextCommand;

    // if we have set a new command timeout (which is the default), start a
    // timer once we've finished executing this command. If we don't clear
    // the timer (which is done when a new command comes in), we will trigger
    // automatic session deletion in this.onCommandTimeout. Of course we don't
    // want to trigger the timer when the user is shutting down the session
    // intentionally
    if (this.newCommandTimeoutMs && cmd !== 'deleteSession') {
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

  async startUnexpectedShutdown (err = null) {
    if (err === null) {
      err = new Error("The driver shut down unexpectedly");
    }
    this.onUnexpectedShutdown.cancel(err); // allow others to listen for this
    this.curCommandCancellable.cancel(err);
    this.shutdownUnexpectedly = true;
    await this.deleteSession();
    this.shutdownUnexpectedly = false;
  }

}

for (let [cmd, fn] of _.pairs(commands)) {
  BaseDriver.prototype[cmd] = fn;
}

export { BaseDriver };
