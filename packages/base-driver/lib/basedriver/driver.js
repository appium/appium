/* eslint-disable require-await */
/* eslint-disable no-unused-vars */

import {
  validateCaps,
  PREFIXED_APPIUM_OPTS_CAP,
  processCapabilities,
  promoteAppiumOptions,
} from './capabilities';
import {DriverCore} from './core';
import {util} from '@appium/support';
import B from 'bluebird';
import _ from 'lodash';
import {fixCaps, isW3cCaps} from '../helpers/capabilities';
import {DELETE_SESSION_COMMAND, determineProtocol, errors} from '../protocol';
import {createBaseDriverClass} from './commands';
import helpers from './helpers';
import {BASE_DESIRED_CAP_CONSTRAINTS} from '@appium/types';

const EVENT_SESSION_INIT = 'newSessionRequested';
const EVENT_SESSION_START = 'newSessionStarted';
const EVENT_SESSION_QUIT_START = 'quitSessionRequested';
const EVENT_SESSION_QUIT_DONE = 'quitSessionFinished';
const ON_UNEXPECTED_SHUTDOWN_EVENT = 'onUnexpectedShutdown';

/**
 * @implements {SessionHandler<C>}
 * @template {Constraints} C
 * @template {StringRecord} [CArgs=StringRecord]
 * @extends {DriverCore<C>}
 */
export class BaseDriverCore extends DriverCore {
  /**
   * @type {CArgs & ServerArgs}
   */
  cliArgs;

  /**
   * @type {Capabilities<C>}
   */
  caps;

  /**
   * @type {W3CCapabilities<C>}
   */
  originalCaps;

  /**
   * @type {C}
   */
  desiredCapConstraints;

  /**
   * @type {DriverOpts<C> & DriverOpts<BaseDriverCapConstraints>}
   */
  opts;

  /**
   *
   * @param {DriverOpts<C>} opts
   * @param {boolean} shouldValidateCaps
   */
  constructor(opts = /** @type {DriverOpts<C>} */ ({}), shouldValidateCaps = true) {
    super(opts, shouldValidateCaps);

    /**
     * This must be assigned here because the declaration of {@linkcode BaseDriverCore.opts} above
     * blows away {@linkcode DriverCore.opts}.
     */
    this.opts = opts;

    this.caps = {};

    this.cliArgs = /** @type {CArgs & ServerArgs} */ ({});
  }

  /**
   * Contains the base constraints plus whatever the subclass wants to add.
   *
   * Subclasses _shouldn't_ need to use this. If you need to use this, please create
   * an issue:
   * @see https://github.com/appium/appium/issues/new
   * @type {Readonly<BaseDriverCapConstraints & C>}
   * @protected
   */
  get _desiredCapConstraints() {
    return Object.freeze(_.merge({}, BASE_DESIRED_CAP_CONSTRAINTS, this.desiredCapConstraints));
  }

  // This is the main command handler for the driver. It wraps command
  // execution with timeout logic, checking that we have a valid session,
  // and ensuring that we execute commands one at a time. This method is called
  // by MJSONWP's express router.
  /**
   * @param {string} cmd
   * @param  {...any} args
   * @returns {Promise<any>}
   */
  async executeCommand(cmd, ...args) {
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
      throw new errors.NoSuchDriverError('The driver was unexpectedly shut down!');
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
          this.eventEmitter.on(ON_UNEXPECTED_SHUTDOWN_EVENT, unexpectedShutdownListener);
        }),
      ]).finally(() => {
        if (unexpectedShutdownListener) {
          // This is needed to prevent memory leaks
          this.eventEmitter.removeListener(
            ON_UNEXPECTED_SHUTDOWN_EVENT,
            unexpectedShutdownListener
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
   * @param {Error|import('../protocol/errors').NoSuchDriverError} err
   */
  async startUnexpectedShutdown(
    err = new errors.NoSuchDriverError('The driver was unexpectedly shut down!')
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

  async startNewCommandTimeout() {
    // make sure there are no rogue timeouts
    await this.clearNewCommandTimeout();

    // if command timeout is 0, it is disabled
    if (!this.newCommandTimeoutMs) return; // eslint-disable-line curly

    this.noCommandTimer = setTimeout(async () => {
      this.log.warn(
        `Shutting down because we waited ` +
          `${this.newCommandTimeoutMs / 1000.0} seconds for a command`
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
  assignServer(server, host, port, path) {
    this.server = server;
    this.serverHost = host;
    this.serverPort = port;
    this.serverPath = path;
  }

  /*
   * Restart the session with the original caps,
   * preserving the timeout config.
   */
  async reset() {
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
   * @param {W3CCapabilities<C>} w3cCapabilities1
   * @param {W3CCapabilities<C>} [w3cCapabilities2]
   * @param {W3CCapabilities<C>} [w3cCapabilities]
   * @param {DriverData[]} [driverData]
   * @returns {Promise<[string,Capabilities<C>]>}
   */
  async createSession(w3cCapabilities1, w3cCapabilities2, w3cCapabilities, driverData) {
    if (this.sessionId !== null) {
      throw new errors.SessionNotCreatedError(
        'Cannot create a new session while one is in progress'
      );
    }

    this.log.debug();

    const originalCaps = _.cloneDeep(
      [w3cCapabilities, w3cCapabilities1, w3cCapabilities2].find(isW3cCaps)
    );
    if (!originalCaps) {
      throw new errors.SessionNotCreatedError(
        'Appium only supports W3C-style capability objects. ' +
          'Your client is sending an older capabilities format. Please update your client library.'
      );
    }

    this.setProtocolW3C();

    this.originalCaps = originalCaps;
    this.log.debug(
      `Creating session with W3C capabilities: ${JSON.stringify(originalCaps, null, 2)}`
    );

    /** @type {Capabilities<C>} */
    let caps;
    try {
      caps = processCapabilities(
        promoteAppiumOptions(originalCaps),
        this._desiredCapConstraints,
        this.shouldValidateCaps
      );
      caps = fixCaps(caps, this._desiredCapConstraints, this.log);
    } catch (e) {
      throw new errors.SessionNotCreatedError(e.message);
    }

    this.validateDesiredCaps(caps);

    this.sessionId = util.uuidV4();
    this.caps = caps;
    // merge caps onto opts so we don't need to worry about what's where
    this.opts = {..._.cloneDeep(this.initialOpts), ...this.caps};

    // deal with resets
    // some people like to do weird things by setting noReset and fullReset
    // both to true, but this is misguided and strange, so error here instead
    if (this.opts.noReset && this.opts.fullReset) {
      throw new Error(
        "The 'noReset' and 'fullReset' capabilities are mutually " +
          'exclusive and should not both be set to true. You ' +
          "probably meant to just use 'fullReset' on its own"
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
      this.newCommandTimeoutMs = /** @type {number} */ (this.caps.newCommandTimeout) * 1000;
    }

    this._log.prefix = helpers.generateDriverLogPrefix(this, this.sessionId);

    this.log.info(`Session created with session id: ${this.sessionId}`);

    return [this.sessionId, caps];
  }

  /**
   *
   * @param {string} [sessionId]
   * @param {DriverData[]} [driverData]
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId, driverData) {
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
    this._log.prefix = helpers.generateDriverLogPrefix(this);
  }

  /**
   *
   * @param {Capabilities<C>} caps
   */
  logExtraCaps(caps) {
    let extraCaps = _.difference(_.keys(caps), _.keys(this._desiredCapConstraints));
    if (extraCaps.length) {
      this.log.warn(
        `The following capabilities were provided, but are not ` + `recognized by Appium:`
      );
      for (const cap of extraCaps) {
        this.log.warn(`  ${cap}`);
      }
    }
  }

  /**
   *
   * @param {Capabilities<C>} caps
   * @returns {boolean}
   */
  validateDesiredCaps(caps) {
    if (!this.shouldValidateCaps) {
      return true;
    }

    try {
      validateCaps(caps, this._desiredCapConstraints);
    } catch (e) {
      this.log.errorAndThrow(
        new errors.SessionNotCreatedError(
          `The desiredCapabilities object was not valid for the ` +
            `following reason(s): ${e.message}`
        )
      );
    }

    this.logExtraCaps(caps);

    return true;
  }
}

/**
 * This ensures that all of the mixins correctly implement the interface described in {@linkcode Driver}.
 * @template {Constraints} [C={}]
 * @implements {Driver<C>}
 */
export class BaseDriver extends createBaseDriverClass(BaseDriverCore) {}
export default BaseDriver;

/**
 * @typedef {import('@appium/types').HTTPMethod} HTTPMethod
 * @typedef {import('@appium/types').DriverData} DriverData
 * @typedef {import('@appium/types').Constraints} Constraints
 * @typedef {import('@appium/types').Constraint} Constraint
 * @typedef {import('@appium/types').StringRecord} StringRecord
 * @typedef {import('@appium/types').BaseDriverCapConstraints} BaseDriverCapConstraints
 * @typedef {import('@appium/types').ServerArgs} ServerArgs
 */

/**
 * @callback UpdateServerCallback
 * @param {import('express').Express} app - Express app
 * @param {import('@appium/types').AppiumServer} httpServer - HTTP server
 * @returns {import('type-fest').Promisable<void>}
 */

/**
 * This is used to extend {@linkcode BaseDriverCore} by the mixins and also external drivers.
 * @template {Constraints} C
 * @template [Proto={}]
 * @template [Static={}]
 * @typedef {import('@appium/types').Class<BaseDriverCore<C> & Proto,import('@appium/types').DriverStatic & Static>} BaseDriverBase
 */

/**
 * @template {Constraints} [C=BaseDriverCapConstraints]
 * @typedef {import('@appium/types').SessionHandler<[string, object],void, C>} SessionHandler
 */

/**
 * @template {Constraints} [C=BaseDriverCapConstraints]
 * @template {StringRecord|void} [Extra=void]
 * @typedef {import('@appium/types').Capabilities<C, Extra>} Capabilities
 */

/**
 * @template {Constraints} [C=BaseDriverCapConstraints]
 * @template {StringRecord|void} [Extra=void]
 * @typedef {import('@appium/types').W3CCapabilities<C, Extra>} W3CCapabilities
 */

/**
 * @template {Constraints} [C=BaseDriverCapConstraints]
 * @template {StringRecord} [CArgs=StringRecord]
 * @typedef {import('@appium/types').Driver<C, CArgs>} Driver
 */

/**
 * @template {Constraints} C
 * @typedef {import('@appium/types').ExternalDriver<C>} ExternalDriver
 */

/**
 * @template {Constraints} C
 * @typedef {import('@appium/types').DriverOpts<C>} DriverOpts
 */
