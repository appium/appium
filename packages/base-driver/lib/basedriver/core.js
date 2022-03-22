// @ts-check
/* eslint-disable no-unused-vars */
/* eslint-disable require-await */

import { fs, logger, node } from '@appium/support';
import AsyncLock from 'async-lock';
import { EventEmitter } from 'events';
import _ from 'lodash';
import os from 'os';
import { DEFAULT_BASE_PATH, PROTOCOLS } from '../constants';
import { errors } from '../protocol';
import { validateCaps } from './capabilities';
import { desiredCapabilityConstraints } from './desired-caps';
import DeviceSettings from './device-settings';
import helpers from './helpers';

// for compat with running tests transpiled and in-place
const {version: BASEDRIVER_VER} = fs.readPackageJsonFrom(__dirname);

const NEW_COMMAND_TIMEOUT_MS = 60 * 1000;

const ON_UNEXPECTED_SHUTDOWN_EVENT = 'onUnexpectedShutdown';
/**
 * @implements {Core}
 */
class DriverCore {

  /**
   * Make the basedriver version available so for any driver which inherits from this package, we
   * know which version of basedriver it inherited from
   */
   static baseVersion = BASEDRIVER_VER;

   /**
    * @type {string?}
    */
   sessionId = null;

   /**
    * @type {DriverOpts}
    */
   opts;

   /**
    * @type {DriverOpts}
    */
   initialOpts;

   /**
    * @type {Capabilities}
    */
   caps;

   /**
    * @type {W3CCapabilities}
    */
   originalCaps;

   helpers = helpers;

   /**
    * basePath is used for several purposes, for example in setting up
    * proxying to other drivers, since we need to know what the base path
    * of any incoming request might look like. We set it to the default
    * initially but it is automatically updated during any actual program
    * execution by the routeConfiguringFunction, which is necessarily run as
    * the entrypoint for any Appium server
    */
   basePath = DEFAULT_BASE_PATH;

   relaxedSecurityEnabled = false;

   /** @type {string[]} */
   allowInsecure = [];

   /** @type {string[]} */
   denyInsecure = [];

   newCommandTimeoutMs = NEW_COMMAND_TIMEOUT_MS;

   implicitWaitMs = 0;

   /** @type {string[]} */
   locatorStrategies = [];

   /** @type {string[]} */
   webLocatorStrategies = [];

   /** @type {Driver[]} */
   managedDrivers = [];

   /** @type {NodeJS.Timeout?} */
   noCommandTimer = null;

   /** @type {EventHistory} */
   _eventHistory = {commands: []};

   _constraints = _.cloneDeep(desiredCapabilityConstraints);

   // used to handle driver events
   /** @type {NodeJS.EventEmitter} */
   eventEmitter = new EventEmitter();

   /**
    * @type {AppiumLogger?}
    */
   _log = null;

   /**
    * @protected
    */
   shutdownUnexpectedly = false;

   /**
    * @type {boolean}
    * @protected
    */
   shouldValidateCaps;

   /**
    * @protected
    */
   commandsQueueGuard = new AsyncLock();

   /**
    * settings should be instantiated by drivers which extend BaseDriver, but
    * we set it to an empty DeviceSettings instance here to make sure that the
    * default settings are applied even if an extending driver doesn't utilize
    * the settings functionality itself
    */
   settings = new DeviceSettings();

   constructor (
     opts = /** @type {DriverOpts} */ ({}),
     shouldValidateCaps = true,
   ) {
     // setup state
     this.opts = opts;

     // use a custom tmp dir to avoid losing data and app when computer is
     // restarted
     this.opts.tmpDir =
       this.opts.tmpDir || process.env.APPIUM_TMP_DIR || os.tmpdir();

     // base-driver internals
     this.shouldValidateCaps = shouldValidateCaps;

     // keeping track of initial opts
     this.initialOpts = _.cloneDeep(this.opts);

     this.sessionId = null;
   }

   get log () {
     if (!this._log) {
       const instanceName = `${this.constructor.name}@${node
         .getObjectId(this)
         .substring(0, 8)}`;
       this._log = logger.getLogger(() =>
         this.sessionId
           ? `${instanceName} (${this.sessionId.substring(0, 8)})`
           : instanceName,
       );
     }

     return this._log;
   }

   /**
    * Set a callback handler if needed to execute a custom piece of code
    * when the driver is shut down unexpectedly. Multiple calls to this method
    * will cause the handler to be executed mutiple times
    *
    * @param {(...args: any[]) => void} handler The code to be executed on unexpected shutdown.
    * The function may accept one argument, which is the actual error instance, which
    * caused the driver to shut down.
    */
   onUnexpectedShutdown (handler) {
     this.eventEmitter.on(ON_UNEXPECTED_SHUTDOWN_EVENT, handler);
   }

   /**
    * This property is used by AppiumDriver to store the data of the
    * specific driver sessions. This data can be later used to adjust
    * properties for driver instances running in parallel.
    * Override it in inherited driver classes if necessary.
    *
    * @return {Record<string,unknown>} Driver properties mapping
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

   /**
    * API method for driver developers to log timings for important events
    * @param {string} eventName
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
     const ts = Date.now();
     const logTime = new Date(ts).toTimeString();
     this._eventHistory[eventName].push(ts);
     this.log.debug(`Event '${eventName}' logged at ${ts} (${logTime})`);
   }

   /**
    * Overridden in appium driver, but here so that individual drivers can be
    * tested with clients that poll
    */
   async getStatus () {
     return {};
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

   /**
    * method required by MJSONWP in order to determine whether it should
    * respond with an invalid session response
    * @param {string} [sessionId]
    * @returns {boolean}
    */
   sessionExists (sessionId) {
     if (!sessionId) return false; // eslint-disable-line curly
     return sessionId === this.sessionId;
   }

   /**
    * method required by MJSONWP in order to determine if the command should
    * be proxied directly to the driver
    * @param {string} sessionId
    * @returns {this | import('@appium/types').Driver}
    */
   driverForSession (sessionId) {
     return this;
   }

   /**
    *
    * @param {Capabilities} caps
    */
   logExtraCaps (caps) {
     let extraCaps = _.difference(_.keys(caps), _.keys(this._constraints));
     if (extraCaps.length) {
       this.log.warn(
         `The following capabilities were provided, but are not ` +
           `recognized by Appium:`,
       );
       for (const cap of extraCaps) {
         this.log.warn(`  ${cap}`);
       }
     }
   }

   /**
    *
    * @param {Capabilities} caps
    * @returns {boolean}
    */
   validateDesiredCaps (caps) {
     if (!this.shouldValidateCaps) {
       return true;
     }

     try {
       validateCaps(caps, this._constraints);
     } catch (e) {
       this.log.errorAndThrow(
         new errors.SessionNotCreatedError(
           `The desiredCapabilities object was not valid for the ` +
             `following reason(s): ${e.message}`,
         ),
       );
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
       throw new Error(
         `Potentially insecure feature '${name}' has not been ` +
           `enabled. If you want to enable this feature and accept ` +
           `the security ramifications, please do so by following ` +
           `the documented instructions at https://github.com/appium` +
           `/appium/blob/master/docs/en/writing-running-appium/security.md`,
       );
     }
   }

   /**
    *
    * @param {string} strategy
    * @param {boolean} [webContext]
    */
   validateLocatorStrategy (strategy, webContext = false) {
     let validStrategies = this.locatorStrategies;
     this.log.debug(
       `Valid locator strategies for this request: ${validStrategies.join(
         ', ',
       )}`,
     );

     if (webContext) {
       validStrategies = validStrategies.concat(this.webLocatorStrategies);
     }

     if (!_.includes(validStrategies, strategy)) {
       throw new errors.InvalidSelectorError(
         `Locator Strategy '${strategy}' is not supported for this session`,
       );
     }
   }

   /**
    *
    * @param {string} [sessionId]
    * @returns {boolean}
    */
   proxyActive (sessionId) {
     return false;
   }

   /**
    *
    * @param {string} sessionId
    * @returns {[string, RegExp][]}
    */
   getProxyAvoidList (sessionId) {
     return [];
   }

   /**
    *
    * @param {string} [sessionId]
    * @returns {boolean}
    */
   canProxy (sessionId) {
     return false;
   }

   /**
    * Whether a given command route (expressed as method and url) should not be
    * proxied according to this driver
    *
    * @param {string} sessionId - the current sessionId (in case the driver runs
    * multiple session ids and requires it). This is not used in this method but
    * should be made available to overridden methods.
    * @param {import('@appium/types').HTTPMethod} method - HTTP method of the route
    * @param {string} url - url of the route
    * @param {any} [body] - webdriver request body
    *
    * @returns {boolean} - whether the route should be avoided
    */
   proxyRouteIsAvoided (sessionId, method, url, body) {
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
       let normalizedUrl = url.replace(
         new RegExp(`^${_.escapeRegExp(this.basePath)}`),
         '',
       );
       if (avoidMethod === method && avoidPathRegex.test(normalizedUrl)) {
         return true;
       }
     }
     return false;
   }

   /**
    *
    * @param {Driver} driver
    */
   addManagedDriver (driver) {
     this.managedDrivers.push(driver);
   }

   getManagedDrivers () {
     return this.managedDrivers;
   }

   async clearNewCommandTimeout () {
     if (this.noCommandTimer) {
       clearTimeout(this.noCommandTimer);
       this.noCommandTimer = null;
     }
   }
}

export {DriverCore};

/**
 * @typedef {import('@appium/types').Capabilities} Capabilities
 * @typedef {import('@appium/types').W3CCapabilities} W3CCapabilities
 * @typedef {import('@appium/types').Driver} Driver
 * @typedef {import('@appium/types').Core} Core
 * @typedef {import('@appium/types').DriverOpts} DriverOpts
 * @typedef {import('@appium/types').EventHistory} EventHistory
 * @typedef {import('@appium/types').AppiumLogger} AppiumLogger
 */
