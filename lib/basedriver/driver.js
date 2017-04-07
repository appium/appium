import { MobileJsonWireProtocol, errors } from '../mjsonwp';
import os from 'os';
import commands from './commands';
import helpers from './helpers';
import log from './logger';
import { desiredCapabilityConstraints } from './desired-caps';
import { validateCaps } from './capabilities';
import B from 'bluebird';
import _ from 'lodash';
import { util } from 'appium-support';


const NEW_COMMAND_TIMEOUT_MS = 60 * 1000;

const EVENT_SESSION_INIT = 'newSessionRequested';
const EVENT_SESSION_START = 'newSessionStarted';
const EVENT_SESSION_QUIT_START = 'quitSessionRequested';
const EVENT_SESSION_QUIT_DONE = 'quitSessionFinished';

class BaseDriver extends MobileJsonWireProtocol {

  constructor (opts = {}, shouldValidateCaps = true) {
    super();

    // setup state
    this.sessionId = null;
    this.opts = opts;
    this.caps = null;
    this.helpers = helpers;

    // timeout initialization
    this.newCommandTimeoutMs = NEW_COMMAND_TIMEOUT_MS;
    this.implicitWaitMs = 0;

    this._constraints = _.cloneDeep(desiredCapabilityConstraints);
    this.locatorStrategies = [];
    this.webLocatorStrategies = [];

    // use a custom tmp dir to avoid losing data and app when computer is
    // restarted
    this.opts.tmpDir = this.opts.tmpDir ||
                       process.env.APPIUM_TMP_DIR ||
                       os.tmpdir();

    // base-driver internals
    this.curCommand = new B((r) => { r(); }); // see note in execute
    this.curCommandCancellable = new B((r) => { r(); }); // see note in execute
    this.shutdownUnexpectedly = false;
    this.noCommandTimer = null;
    this.shouldValidateCaps = shouldValidateCaps;
    // settings should be instantiated by implementing drivers
    this.settings = null;
    this.resetOnUnexpectedShutdown();

    // keeping track of initial opts
    this.initialOpts = _.cloneDeep(this.opts);

    // allow subclasses to have internal drivers
    this.managedDrivers = [];

    // store event timings
    this._eventHistory = {
      commands: [] // commands get a special place
    };
  }

  /*
   * make eventHistory a property and return a cloned object so a consumer can't
   * inadvertently change data outside of logEvent
   */
  get eventHistory () {
    return _.cloneDeep(this._eventHistory);
  }

  /*
   * API method for driver developers to log timings for important events
   */
  logEvent (eventName) {
    if (eventName === "commands") {
      throw new Error("Cannot log commands directly");
    }
    if (typeof eventName !== "string") {
      throw new Error(`Invalid eventName ${eventName}`);
    }
    if (!this._eventHistory[eventName]) {
      this._eventHistory[eventName] = [];
    }
    let ts = Date.now();
    let logTime = (new Date(ts)).toTimeString();
    this._eventHistory[eventName].push(ts);
    log.debug(`Event '${eventName}' logged at ${ts} (${logTime})`);
  }

  /*
   * Overridden in appium driver, but here so that individual drivers can be
   * tested with clients that poll
   */
  async getStatus () {
    return {};
  }

  /*
   * Initialize a new onUnexpectedShutdown promise, cancelling existing one.
   */
  resetOnUnexpectedShutdown () {
    if (this.onUnexpectedShutdown && !this.onUnexpectedShutdown.isFulfilled()) {
      this.onUnexpectedShutdown.cancel();
    }
    this.onUnexpectedShutdown = new B((resolve, reject) => {
      this.unexpectedShutdownDeferred  = {resolve, reject};
    }).cancellable();
    // noop handler to avoid warning.
    this.onUnexpectedShutdown.catch(() => {});
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

  // method required by MJSONWP in order to determine if the command should
  // be proxied directly to the driver
  driverForSession (/*sessionId*/) {
    return this;
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

    try {
      validateCaps(caps, this._constraints);
    } catch (e) {
      log.errorAndThrow(new errors.SessionNotCreatedError(`The desiredCapabilities object was not valid for the ` +
                    `following reason(s): ${e.message}`));
    }

    this.logExtraCaps(caps);

    return true;
  }

  // This is the main command handler for the driver. It wraps command
  // execution with timeout logic, checking that we have a valid session,
  // and ensuring that we execute commands one at a time. This method is called
  // by MJSONWP's express router.
  async executeCommand (cmd, ...args) {
    // get start time for this command, and log in special cases
    let startTime = Date.now();
    if (cmd === 'createSession') {
      this.logEvent(EVENT_SESSION_INIT);
    } else if (cmd === 'deleteSession') {
      this.logEvent(EVENT_SESSION_QUIT_START);
    }

    // if we had a command timer running, clear it now that we're starting
    // a new command and so don't want to time out
    this.clearNewCommandTimeout();

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
        return B.reject(new errors.NoSuchDriverError('The driver was unexpectedly shut down!'));
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
    if (cmd !== 'deleteSession') {
      // reseting existing timeout
      this.startNewCommandTimeout();
    }

    // log timing information about this command
    let endTime = Date.now();
    this._eventHistory.commands.push({cmd, startTime, endTime});
    if (cmd === 'createSession') {
      this.logEvent(EVENT_SESSION_START);
    } else if (cmd === 'deleteSession') {
      this.logEvent(EVENT_SESSION_QUIT_DONE);
    }

    return res;
  }

  async startUnexpectedShutdown (err = new errors.NoSuchDriverError('The driver was unexpectedly shut down!')) {
    this.unexpectedShutdownDeferred.reject(err); // allow others to listen for this
    this.curCommandCancellable.cancel(err);
    this.shutdownUnexpectedly = true;
    await this.deleteSession(this.sessionId);
    this.shutdownUnexpectedly = false;
  }

  validateLocatorStrategy (strategy, webContext = false) {
    let validStrategies = this.locatorStrategies;
    log.debug(`Valid locator strategies for this request: ${validStrategies.join(', ')}`);

    if (webContext) {
      validStrategies = validStrategies.concat(this.webLocatorStrategies);
    }

    if (!_.includes(validStrategies, strategy)) {
      throw new errors.InvalidSelectorError(`Locator Strategy '${strategy}' is not supported for this session`);
    }
  }

  /*
   * Restart the session with the original caps,
   * preserving the timeout config.
   */
  async reset () {
    log.debug('Resetting app mid-session');
    log.debug('Running generic full reset');

    // preserving state
    let currentConfig = {};
    for (let property of ['implicitWaitMs', 'newCommandTimeoutMs', 'sessionId', 'resetOnUnexpectedShutdown']) {
      currentConfig[property] = this[property];
    }

    // We also need to preserve the unexpected shutdown, and make sure it is not cancelled during reset.
    this.resetOnUnexpectedShutdown = () => {};

    try {
      await this.deleteSession(this.sessionId);
      log.debug('Restarting app');
      await this.createSession(this.caps);
    } finally {
      // always restore state.
      for (let [key, value] of _.toPairs(currentConfig)) {
        this[key] = value;
      }
    }
    this.clearNewCommandTimeout();
  }

  async getSwipeOptions (gestures, touchCount = 1) {
    let startX =  this.helpers.getCoordDefault(gestures[0].options.x),
        startY = this.helpers.getCoordDefault(gestures[0].options.y),
        endX = this.helpers.getCoordDefault(gestures[2].options.x),
        endY = this.helpers.getCoordDefault(gestures[2].options.y),
        duration = this.helpers.getSwipeTouchDuration(gestures[1]),
        element = gestures[0].options.element,
        destElement = gestures[2].options.element || gestures[0].options.element;

    // there's no destination element handling in bootstrap and since it applies to all platforms, we handle it here
    if (util.hasValue(destElement)) {
      let locResult = await this.getLocationInView(destElement);
      let sizeResult = await this.getSize(destElement);
      let offsetX = (Math.abs(endX) < 1 && Math.abs(endX) > 0) ? sizeResult.width * endX : endX;
      let offsetY = (Math.abs(endY) < 1 && Math.abs(endY) > 0) ? sizeResult.height * endY : endY;
      endX = locResult.x + offsetX;
      endY = locResult.y + offsetY;
      // if the target element was provided, the coordinates for the destination need to be relative to it.
      if (util.hasValue(element)) {
        let firstElLocation = await this.getLocationInView(element);
        endX -= firstElLocation.x;
        endY -= firstElLocation.y;
      }
    }
    // clients are responsible to use these options correctly
    return {startX, startY, endX, endY, duration, touchCount, element};
  }

  proxyActive (/* sessionId */) {
    return false;
  }

  getProxyAvoidList (/* sessionId */) {
    return [];
  }

  canProxy (/* sessionId */) {
    return false;
  }

  addManagedDriver (driver) {
    this.managedDrivers.push(driver);
  }

  getManagedDrivers () {
    return this.managedDrivers;
  }
}

for (let [cmd, fn] of _.toPairs(commands)) {
  BaseDriver.prototype[cmd] = fn;
}

export default BaseDriver;
