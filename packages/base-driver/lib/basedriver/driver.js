// @ts-check
/* eslint-disable require-await */
/* eslint-disable no-unused-vars */

import { DriverCore } from './core';
import { util } from '@appium/support';
import B from 'bluebird';
import _ from 'lodash';
import { fixCaps, isW3cCaps } from '../helpers/capabilities';
import { DELETE_SESSION_COMMAND, determineProtocol, errors } from '../protocol';
import {
  APPIUM_OPTS_CAP,
  PREFIXED_APPIUM_OPTS_CAP,
  processCapabilities,
  promoteAppiumOptions
} from './capabilities';
import { createBaseDriverClass } from './commands';

const EVENT_SESSION_INIT = 'newSessionRequested';
const EVENT_SESSION_START = 'newSessionStarted';
const EVENT_SESSION_QUIT_START = 'quitSessionRequested';
const EVENT_SESSION_QUIT_DONE = 'quitSessionFinished';
const ON_UNEXPECTED_SHUTDOWN_EVENT = 'onUnexpectedShutdown';


/**
 * @implements {SessionHandler}
 */
export class BaseDriverCore extends DriverCore {

  /** @type {Record<string,any>|undefined} */
  cliArgs;

  // This is the main command handler for the driver. It wraps command
  // execution with timeout logic, checking that we have a valid session,
  // and ensuring that we execute commands one at a time. This method is called
  // by MJSONWP's express router.
  /**
    * @param {string} cmd
    * @param  {...any[]} args
    * @returns {Promise<any>}
    */
  async executeCommand (cmd, ...args) {
    // get start time for this command, and log in special cases
    let startTime = Date.now();

    if (cmd === 'createSession') {
      // If creating a session determine if W3C or MJSONWP protocol was requested and remember the choice
      this.protocol = determineProtocol(args);
      this.logEvent(EVENT_SESSION_INIT);
    } else if (cmd === DELETE_SESSION_COMMAND) {
      this.logEvent(EVENT_SESSION_QUIT_START);
    }

    // if we had a command timer running, clear it now that we're starting
    // a new command and so don't want to time out
    await this.clearNewCommandTimeout();

    if (this.shutdownUnexpectedly) {
      throw new errors.NoSuchDriverError(
          'The driver was unexpectedly shut down!',
      );
    }

    // If we don't have this command, it must not be implemented
    if (!this[cmd]) {
      throw new errors.NotYetImplementedError();
    }

    let unexpectedShutdownListener;
    const commandExecutor = async () =>
      await B.race([
        this[cmd](...args),
        new B((resolve, reject) => {
          unexpectedShutdownListener = reject;
          this.eventEmitter.on(
              ON_UNEXPECTED_SHUTDOWN_EVENT,
              unexpectedShutdownListener,
          );
        }),
      ]).finally(() => {
        if (unexpectedShutdownListener) {
          // This is needed to prevent memory leaks
          this.eventEmitter.removeListener(
              ON_UNEXPECTED_SHUTDOWN_EVENT,
              unexpectedShutdownListener,
          );
          unexpectedShutdownListener = null;
        }
      });
    const res = this.isCommandsQueueEnabled
      ? await this.commandsQueueGuard.acquire(BaseDriver.name, commandExecutor)
      : await commandExecutor();

    // if we have set a new command timeout (which is the default), start a
    // timer once we've finished executing this command. If we don't clear
    // the timer (which is done when a new command comes in), we will trigger
    // automatic session deletion in this.onCommandTimeout. Of course we don't
    // want to trigger the timer when the user is shutting down the session
    // intentionally
    if (this.isCommandsQueueEnabled && cmd !== DELETE_SESSION_COMMAND) {
      // resetting existing timeout
      await this.startNewCommandTimeout();
    }

    // log timing information about this command
    const endTime = Date.now();
    this._eventHistory.commands.push({cmd, startTime, endTime});
    if (cmd === 'createSession') {
      this.logEvent(EVENT_SESSION_START);
    } else if (cmd === DELETE_SESSION_COMMAND) {
      this.logEvent(EVENT_SESSION_QUIT_DONE);
    }

    return res;
  }

  /**
    *
    * @param {Error} err
    */
  async startUnexpectedShutdown (
    err = new errors.NoSuchDriverError(
        'The driver was unexpectedly shut down!',
    ),
  ) {
    this.eventEmitter.emit(ON_UNEXPECTED_SHUTDOWN_EVENT, err); // allow others to listen for this
    this.shutdownUnexpectedly = true;
    try {
      if (this.sessionId !== null) {
        await this.deleteSession(this.sessionId);
      }
    } finally {
      this.shutdownUnexpectedly = false;
    }
  }

  async startNewCommandTimeout () {
    // make sure there are no rogue timeouts
    await this.clearNewCommandTimeout();

    // if command timeout is 0, it is disabled
    if (!this.newCommandTimeoutMs) return; // eslint-disable-line curly

    this.noCommandTimer = setTimeout(async () => {
      this.log.warn(
        `Shutting down because we waited ` +
          `${this.newCommandTimeoutMs / 1000.0} seconds for a command`,
      );
      const errorMessage =
        `New Command Timeout of ` +
        `${this.newCommandTimeoutMs / 1000.0} seconds ` +
        `expired. Try customizing the timeout using the ` +
        `'newCommandTimeout' desired capability`;
      await this.startUnexpectedShutdown(new Error(errorMessage));
    }, this.newCommandTimeoutMs);
  }

  /**
   *
   * @param {import('@appium/types').AppiumServer} server
   * @param {string} host
   * @param {number} port
   * @param {string} path
   */
  assignServer (server, host, port, path) {
    this.server = server;
    this.serverHost = host;
    this.serverPort = port;
    this.serverPath = path;
  }

  /*
    * Restart the session with the original caps,
    * preserving the timeout config.
    */
  async reset () {
    this.log.debug('Resetting app mid-session');
    this.log.debug('Running generic full reset');

    // preserving state
    let currentConfig = {};
    for (let property of [
      'implicitWaitMs',
      'newCommandTimeoutMs',
      'sessionId',
      'resetOnUnexpectedShutdown',
    ]) {
      currentConfig[property] = this[property];
    }

    // We also need to preserve the unexpected shutdown, and make sure it is not cancelled during reset.
    this.resetOnUnexpectedShutdown = () => {};

    try {
      if (this.sessionId !== null) {
        await this.deleteSession(this.sessionId);
      }
      this.log.debug('Restarting app');
      await this.createSession(this.originalCaps);
    } finally {
      // always restore state.
      for (let [key, value] of _.toPairs(currentConfig)) {
        this[key] = value;
      }
    }
    await this.clearNewCommandTimeout();
  }

  /**
     *
     * Historically the first two arguments were reserved for JSONWP capabilities.
     * Appium 2 has dropped the support of these, so now we only accept capability
     * objects in W3C format and thus allow any of the three arguments to represent
     * the latter.
     * @param {W3CCapabilities} w3cCapabilities1
     * @param {W3CCapabilities} [w3cCapabilities2]
     * @param {W3CCapabilities} [w3cCapabilities]
     * @param {DriverData[]} [driverData]
     * @returns {Promise<[string,object]>}
     */
  async createSession (
    w3cCapabilities1,
    w3cCapabilities2,
    w3cCapabilities,
    driverData,
  ) {
    if (this.sessionId !== null) {
      throw new errors.SessionNotCreatedError(
           'Cannot create a new session while one is in progress',
      );
    }

    this.log.debug();

    const originalCaps = [
      w3cCapabilities,
      w3cCapabilities1,
      w3cCapabilities2,
    ].find(isW3cCaps);
    if (!originalCaps) {
      throw new errors.SessionNotCreatedError(
           'Appium only supports W3C-style capability objects. ' +
             'Your client is sending an older capabilities format. Please update your client library.',
      );
    }

    this.setProtocolW3C();

    this.originalCaps = _.cloneDeep(originalCaps);
    this.log.debug(
         `Creating session with W3C capabilities: ${JSON.stringify(
           originalCaps,
           null,
           2,
         )}`,
    );

    let caps;
    try {
      caps = processCapabilities(
           originalCaps,
           this.desiredCapConstraints,
           this.shouldValidateCaps,
      );
      if (caps[APPIUM_OPTS_CAP]) {
        this.log.debug(
             `Found ${PREFIXED_APPIUM_OPTS_CAP} capability present; will promote items inside to caps`,
        );
        caps = promoteAppiumOptions(caps);
      }
      caps = fixCaps(caps, this.desiredCapConstraints, this.log);
    } catch (e) {
      throw new errors.SessionNotCreatedError(e.message);
    }

    this.validateDesiredCaps(caps);

    this.sessionId = util.uuidV4();
    this.caps = caps;
    this.opts = _.cloneDeep(this.initialOpts);

    // merge caps onto opts so we don't need to worry about what's where
    Object.assign(this.opts, this.caps);

    // deal with resets
    // some people like to do weird things by setting noReset and fullReset
    // both to true, but this is misguided and strange, so error here instead
    if (this.opts.noReset && this.opts.fullReset) {
      throw new Error(
           "The 'noReset' and 'fullReset' capabilities are mutually " +
             'exclusive and should not both be set to true. You ' +
             "probably meant to just use 'fullReset' on its own",
      );
    }
    if (this.opts.noReset === true) {
      this.opts.fullReset = false;
    }
    if (this.opts.fullReset === true) {
      this.opts.noReset = false;
    }
    this.opts.fastReset = !this.opts.fullReset && !this.opts.noReset;
    this.opts.skipUninstall = this.opts.fastReset || this.opts.noReset;

    // Prevents empty string caps so we don't need to test it everywhere
    if (typeof this.opts.app === 'string' && this.opts.app.trim() === '') {
      delete this.opts.app;
    }

    if (!_.isUndefined(this.caps.newCommandTimeout)) {
      this.newCommandTimeoutMs = this.caps.newCommandTimeout * 1000;
    }

    this.log.info(`Session created with session id: ${this.sessionId}`);

    return [this.sessionId, caps];
  }

  /**
    *
    * @param {string} [sessionId]
    * @param {DriverData[]} [driverData]
    * @returns {Promise<void>}
    */
  async deleteSession (sessionId, driverData) {
    await this.clearNewCommandTimeout();
    if (this.isCommandsQueueEnabled && this.commandsQueueGuard.isBusy()) {
      // simple hack to release pending commands if they exist
      // @ts-ignore
      for (const key of _.keys(this.commandsQueueGuard.queues)) {
        // @ts-ignore
        this.commandsQueueGuard.queues[key] = [];
      }
    }
    this.sessionId = null;
  }
}

/**
 * This ensures that all of the mixins correctly implement the interface described in {@linkcode Driver}.
 * @implements {Driver}
 */
class BaseDriver extends createBaseDriverClass(BaseDriverCore) {}
export { BaseDriver };
export default BaseDriver;

/**
 * @typedef {import('@appium/types').HTTPMethod} HTTPMethod
 * @typedef {import('@appium/types').Driver} Driver
 * @typedef {import('@appium/types').Capabilities} Capabilities
 * @typedef {import('@appium/types').W3CCapabilities} W3CCapabilities
 * @typedef {import('@appium/types').DriverData} DriverData
 */


/**
 * @callback UpdateServerCallback
 * @param {import('express').Express} app - Express app
 * @param {import('@appium/types').AppiumServer} httpServer - HTTP server
 * @returns {import('type-fest').Promisable<void>}
 */

/**
 * This is used to extend {@linkcode BaseDriverCore} by the mixins and also external drivers.
 * @template [Proto={}]
 * @template [Static={}]
 * @typedef {import('@appium/types').Class<BaseDriverCore & Proto,BaseDriverStatic & Static>} BaseDriverBase
 */

/**
 * Static properties of `BaseDriver` and optional properties for subclasses.
 * @typedef BaseDriverStatic
 * @property {string} baseVersion
 * @property {UpdateServerCallback} [updateServer]
 * @property {import('@appium/types').MethodMap} [newMethodMap]
 */

/**
 * @typedef {import('@appium/types').SessionHandler<[string, object],void>} SessionHandler
 */
