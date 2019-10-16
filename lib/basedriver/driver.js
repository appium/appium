import { Protocol, errors, DEFAULT_BASE_PATH, W3C_ELEMENT_KEY,
         MJSONWP_ELEMENT_KEY, PROTOCOLS, determineProtocol } from '../protocol';
import os from 'os';
import commands from './commands';
import * as helpers from './helpers';
import log from './logger';
import DeviceSettings from './device-settings';
import { desiredCapabilityConstraints } from './desired-caps';
import { validateCaps } from './capabilities';
import B from 'bluebird';
import _ from 'lodash';
import { util } from 'appium-support';
import { ImageElement, makeImageElementCache, getImgElFromArgs } from './image-element';
import AsyncLock from 'async-lock';


B.config({
  cancellation: true,
});

const NEW_COMMAND_TIMEOUT_MS = 60 * 1000;

const EVENT_SESSION_INIT = 'newSessionRequested';
const EVENT_SESSION_START = 'newSessionStarted';
const EVENT_SESSION_QUIT_START = 'quitSessionRequested';
const EVENT_SESSION_QUIT_DONE = 'quitSessionFinished';

class BaseDriver extends Protocol {

  constructor (opts = {}, shouldValidateCaps = true) {
    super();

    // setup state
    this.sessionId = null;
    this.opts = opts;
    this.caps = null;
    this.helpers = helpers;

    // basePath is used for several purposes, for example in setting up
    // proxying to other drivers, since we need to know what the base path
    // of any incoming request might look like. We set it to the default
    // initially but it is automatically updated during any actual program
    // execution by the routeConfiguringFunction, which is necessarily run as
    // the entrypoint for any Appium server
    this.basePath = DEFAULT_BASE_PATH;

    // initialize security modes
    this.relaxedSecurityEnabled = false;
    this.allowInsecure = [];
    this.denyInsecure = [];

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
    this.shutdownUnexpectedly = false;
    this.noCommandTimer = null;
    this.shouldValidateCaps = shouldValidateCaps;
    this.commandsQueueGuard = new AsyncLock();

    // settings should be instantiated by drivers which extend BaseDriver, but
    // we set it to an empty DeviceSettings instance here to make sure that the
    // default settings are applied even if an extending driver doesn't utilize
    // the settings functionality itself
    this.settings = new DeviceSettings({}, _.noop);

    this.resetOnUnexpectedShutdown();

    // keeping track of initial opts
    this.initialOpts = _.cloneDeep(this.opts);

    // allow subclasses to have internal drivers
    this.managedDrivers = [];

    // store event timings
    this._eventHistory = {
      commands: [] // commands get a special place
    };

    // cache the image elements
    this._imgElCache = makeImageElementCache();

    this.protocol = null;
  }

  /**
   * This property is used by AppiumDriver to store the data of the
   * specific driver sessions. This data can be later used to adjust
   * properties for driver instances running in parallel.
   * Override it in inherited driver classes if necessary.
   *
   * @return {object} Driver properties mapping
   */
  get driverData () {
    return {};
  }

  /**
   * This property controls the way {#executeCommand} method
   * handles new driver commands received from the client.
   * Override it for inherited classes only in special cases.
   *
   * @return {boolean} If the returned value is true (default) then all the commands
   *   received by the particular driver instance are going to be put into the queue,
   *   so each following command will not be executed until the previous command
   *   execution is completed. False value disables that queue, so each driver command
   *   is executed independently and does not wait for anything.
   */
  get isCommandsQueueEnabled () {
    return true;
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
    if (eventName === 'commands') {
      throw new Error('Cannot log commands directly');
    }
    if (typeof eventName !== 'string') {
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
  async getStatus () { // eslint-disable-line require-await
    return {};
  }

  /*
   * Initialize a new onUnexpectedShutdown promise, cancelling existing one.
   */
  resetOnUnexpectedShutdown () {
    if (this.onUnexpectedShutdown && !this.onUnexpectedShutdown.isFulfilled()) {
      this.onUnexpectedShutdown.cancel();
    }
    this.onUnexpectedShutdown = new B((resolve, reject, onCancel) => {
      onCancel(() => reject(new B.CancellationError()));
      this.unexpectedShutdownDeferred = {resolve, reject};
    });
    this.unexpectedShutdownDeferred.promise = this.onUnexpectedShutdown;
    // noop handler to avoid warning.
    this.onUnexpectedShutdown.catch(() => {});
  }

  // we only want subclasses to ever extend the contraints
  set desiredCapConstraints (constraints) {
    this._constraints = Object.assign(this._constraints, constraints);
    // 'presence' means different things in different versions of the validator,
    // when we say 'true' we mean that it should not be able to be empty
    for (const [, value] of _.toPairs(this._constraints)) {
      if (value && value.presence === true) {
        value.presence = {
          allowEmpty: false,
        };
      }
    }
  }

  get desiredCapConstraints () {
    return this._constraints;
  }

  // method required by MJSONWP in order to determine whether it should
  // respond with an invalid session response
  sessionExists (sessionId) {
    if (!sessionId) return false; // eslint-disable-line curly
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
               `recognized by Appium:`);
      for (const cap of extraCaps) {
        log.warn(`  ${cap}`);
      }
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

  isMjsonwpProtocol () {
    return this.protocol === PROTOCOLS.MJSONWP;
  }

  isW3CProtocol () {
    return this.protocol === PROTOCOLS.W3C;
  }

  setProtocolMJSONWP () {
    this.protocol = PROTOCOLS.MJSONWP;
  }

  setProtocolW3C () {
    this.protocol = PROTOCOLS.W3C;
  }

  /**
   * Check whether a given feature is enabled via its name
   *
   * @param {string} name - name of feature/command
   *
   * @returns {Boolean}
   */
  isFeatureEnabled (name) {
    // if we have explicitly denied this feature, return false immediately
    if (this.denyInsecure && _.includes(this.denyInsecure, name)) {
      return false;
    }

    // if we specifically have allowed the feature, return true
    if (this.allowInsecure && _.includes(this.allowInsecure, name)) {
      return true;
    }

    // otherwise, if we've globally allowed insecure features and not denied
    // this one, return true
    if (this.relaxedSecurityEnabled) {
      return true;
    }

    // if we haven't allowed anything insecure, then reject
    return false;
  }

  /**
   * Assert that a given feature is enabled and throw a helpful error if it's
   * not
   *
   * @param {string} name - name of feature/command
   */
  ensureFeatureEnabled (name) {
    if (!this.isFeatureEnabled(name)) {
      throw new Error(`Potentially insecure feature '${name}' has not been ` +
                      `enabled. If you want to enable this feature and accept ` +
                      `the security ramifications, please do so by following ` +
                      `the documented instructions at https://github.com/appium` +
                      `/appium/blob/master/docs/en/writing-running-appium/security.md`);
    }
  }

  // This is the main command handler for the driver. It wraps command
  // execution with timeout logic, checking that we have a valid session,
  // and ensuring that we execute commands one at a time. This method is called
  // by MJSONWP's express router.
  async executeCommand (cmd, ...args) {
    // get start time for this command, and log in special cases
    let startTime = Date.now();
    if (cmd === 'createSession') {
      // If creating a session determine if W3C or MJSONWP protocol was requested and remember the choice
      this.protocol = determineProtocol(...args);
      this.logEvent(EVENT_SESSION_INIT);
    } else if (cmd === 'deleteSession') {
      this.logEvent(EVENT_SESSION_QUIT_START);
    }

    // if we had a command timer running, clear it now that we're starting
    // a new command and so don't want to time out
    this.clearNewCommandTimeout();

    if (this.shutdownUnexpectedly) {
      throw new errors.NoSuchDriverError('The driver was unexpectedly shut down!');
    }

    // If we don't have this command, it must not be implemented
    // If the target element is ImageElement, we must try to call `ImageElement.execute` which exist following lines
    // since ImageElement supports few commands by itself
    const imgElId = getImgElFromArgs(args);
    if (!this[cmd] && !imgElId) {
      throw new errors.NotYetImplementedError();
    }

    const commandExecutor = async () => imgElId
      ? await ImageElement.execute(this, cmd, imgElId, ...args)
      : await B.race([this[cmd](...args), this.unexpectedShutdownDeferred.promise]);
    const res = this.isCommandsQueueEnabled && cmd !== 'executeDriverScript'
      ? await this.commandsQueueGuard.acquire(BaseDriver.name, commandExecutor)
      : await commandExecutor();

    // if we have set a new command timeout (which is the default), start a
    // timer once we've finished executing this command. If we don't clear
    // the timer (which is done when a new command comes in), we will trigger
    // automatic session deletion in this.onCommandTimeout. Of course we don't
    // want to trigger the timer when the user is shutting down the session
    // intentionally
    if (this.isCommandsQueueEnabled && cmd !== 'deleteSession') {
      // resetting existing timeout
      this.startNewCommandTimeout();
    }

    // log timing information about this command
    const endTime = Date.now();
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
    this.shutdownUnexpectedly = true;
    try {
      await this.deleteSession(this.sessionId);
    } finally {
      this.shutdownUnexpectedly = false;
    }
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

    // Construct the arguments for createSession depending on the protocol type
    const args = this.protocol === PROTOCOLS.W3C ?
      [undefined, undefined, {alwaysMatch: this.caps, firstMatch: [{}]}] :
      [this.caps];

    try {
      await this.deleteSession(this.sessionId);
      log.debug('Restarting app');
      await this.createSession(...args);
    } finally {
      // always restore state.
      for (let [key, value] of _.toPairs(currentConfig)) {
        this[key] = value;
      }
    }
    this.clearNewCommandTimeout();
  }

  async getSwipeOptions (gestures, touchCount = 1) {
    let startX = this.helpers.getCoordDefault(gestures[0].options.x),
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

  /**
   * Whether a given command route (expressed as method and url) should not be
   * proxied according to this driver
   *
   * @param {string} sessionId - the current sessionId (in case the driver runs
   * multiple session ids and requires it). This is not used in this method but
   * should be made available to overridden methods.
   * @param {string} method - HTTP method of the route
   * @param {string} url - url of the route
   *
   * @returns {boolean} - whether the route should be avoided
   */
  proxyRouteIsAvoided (sessionId, method, url) {
    for (let avoidSchema of this.getProxyAvoidList(sessionId)) {
      if (!_.isArray(avoidSchema) || avoidSchema.length !== 2) {
        throw new Error('Proxy avoidance must be a list of pairs');
      }
      let [avoidMethod, avoidPathRegex] = avoidSchema;
      if (!_.includes(['GET', 'POST', 'DELETE'], avoidMethod)) {
        throw new Error(`Unrecognized proxy avoidance method '${avoidMethod}'`);
      }
      if (!_.isRegExp(avoidPathRegex)) {
        throw new Error('Proxy avoidance path must be a regular expression');
      }
      let normalizedUrl = url.replace(new RegExp(`^${_.escapeRegExp(this.basePath)}`), '');
      if (avoidMethod === method && avoidPathRegex.test(normalizedUrl)) {
        return true;
      }
    }
    return false;
  }

  addManagedDriver (driver) {
    this.managedDrivers.push(driver);
  }

  getManagedDrivers () {
    return this.managedDrivers;
  }

  registerImageElement (imgEl) {
    this._imgElCache.set(imgEl.id, imgEl);
    const protoKey = this.isW3CProtocol() ? W3C_ELEMENT_KEY : MJSONWP_ELEMENT_KEY;
    return imgEl.asElement(protoKey);
  }
}

for (let [cmd, fn] of _.toPairs(commands)) {
  BaseDriver.prototype[cmd] = fn;
}

export { BaseDriver };
export default BaseDriver;
