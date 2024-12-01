/* eslint-disable no-unused-vars */
/* eslint-disable require-await */

import {logger} from '@appium/support';
import type {
  AppiumLogger,
  Constraints,
  Core,
  Driver,
  DriverOpts,
  EventHistory,
  HTTPMethod,
  InitialOpts,
  Protocol,
  RouteMatcher,
  StringRecord,
  BidiMethodDef,
} from '@appium/types';
import AsyncLock from 'async-lock';
import _ from 'lodash';
import {EventEmitter} from 'node:events';
import os from 'node:os';
import {
  DEFAULT_BASE_PATH,
  PROTOCOLS,
  MAX_LOG_BODY_LENGTH,
} from '../constants';
import {errors} from '../protocol';
import DeviceSettings from './device-settings';
import helpers, {BASEDRIVER_VER} from './helpers';
import {BIDI_COMMANDS} from '../protocol/bidi-commands';

const NEW_COMMAND_TIMEOUT_MS = 60 * 1000;

const ON_UNEXPECTED_SHUTDOWN_EVENT = 'onUnexpectedShutdown';

const ALL_DRIVERS_MATCH = '*';
const FEATURE_NAME_SEPARATOR = ':';

export class DriverCore<const C extends Constraints, Settings extends StringRecord = StringRecord>
  implements Core<C, Settings>
{
  /**
   * Make the basedriver version available so for any driver which inherits from this package, we
   * know which version of basedriver it inherited from
   */
  static baseVersion = BASEDRIVER_VER;

  sessionId: string | null;

  opts: DriverOpts<C>;

  initialOpts: InitialOpts;

  helpers: typeof helpers;

  /**
   * basePath is used for several purposes, for example in setting up
   * proxying to other drivers, since we need to know what the base path
   * of any incoming request might look like. We set it to the default
   * initially but it is automatically updated during any actual program
   * execution by the routeConfiguringFunction, which is necessarily run as
   * the entrypoint for any Appium server
   */
  basePath: string;

  relaxedSecurityEnabled: boolean;

  allowInsecure: string[];

  denyInsecure: string[];

  newCommandTimeoutMs: number;

  implicitWaitMs: number;

  locatorStrategies: string[];

  webLocatorStrategies: string[];

  managedDrivers: Driver[];

  noCommandTimer: NodeJS.Timeout | null;

  protected _eventHistory: EventHistory;

  // used to handle driver events
  eventEmitter: NodeJS.EventEmitter;

  /**
   * @privateRemarks XXX: unsure why this is wrapped in a getter when nothing else is
   */
  protected _log: AppiumLogger;

  shutdownUnexpectedly: boolean;

  shouldValidateCaps: boolean;

  protected commandsQueueGuard: AsyncLock;

  /**
   * settings should be instantiated by drivers which extend BaseDriver, but
   * we set it to an empty DeviceSettings instance here to make sure that the
   * default settings are applied even if an extending driver doesn't utilize
   * the settings functionality itself
   */
  settings: DeviceSettings<Settings>;

  protocol?: Protocol;

  bidiEventSubs: Record<string, string[]>;

  doesSupportBidi: boolean;

  constructor(opts: InitialOpts = <InitialOpts>{}, shouldValidateCaps = true) {
    this._log = logger.getLogger(helpers.generateDriverLogPrefix(this as Core<C>));

    // setup state
    this.opts = opts as DriverOpts<C>;

    // use a custom tmp dir to avoid losing data and app when computer is
    // restarted
    this.opts.tmpDir = this.opts.tmpDir || process.env.APPIUM_TMP_DIR || os.tmpdir();

    // base-driver internals
    this.shouldValidateCaps = shouldValidateCaps;

    // keeping track of initial opts
    this.initialOpts = _.cloneDeep(opts);

    this.sessionId = null;
    this.helpers = helpers;
    this.basePath = DEFAULT_BASE_PATH;
    this.relaxedSecurityEnabled = false;
    this.allowInsecure = [];
    this.denyInsecure = [];
    this.newCommandTimeoutMs = NEW_COMMAND_TIMEOUT_MS;
    this.implicitWaitMs = 0;
    this.locatorStrategies = [];
    this.webLocatorStrategies = [];
    this.managedDrivers = [];
    this.noCommandTimer = null;
    this._eventHistory = {commands: []};
    this.eventEmitter = new EventEmitter();
    this.shutdownUnexpectedly = false;
    this.commandsQueueGuard = new AsyncLock();
    this.settings = new DeviceSettings();
    this.bidiEventSubs = {};
    this.doesSupportBidi = false;
  }

  get log() {
    return this._log;
  }

  /**
   * Set a callback handler if needed to execute a custom piece of code
   * when the driver is shut down unexpectedly. Multiple calls to this method
   * will cause the handler to be executed mutiple times
   *
   * @param handler The code to be executed on unexpected shutdown.
   * The function may accept one argument, which is the actual error instance, which
   * caused the driver to shut down.
   */
  onUnexpectedShutdown(handler: (...args: any[]) => void) {
    this.eventEmitter.on(ON_UNEXPECTED_SHUTDOWN_EVENT, handler);
  }

  /**
   * This property is used by AppiumDriver to store the data of the
   * specific driver sessions. This data can be later used to adjust
   * properties for driver instances running in parallel.
   * Override it in inherited driver classes if necessary.
   */
  get driverData() {
    return {};
  }

  /**
   * This property controls the way the `executeCommand` method
   * handles new driver commands received from the client.
   * Override it for inherited classes only in special cases.
   *
   * @return If the returned value is true (default) then all the commands
   *   received by the particular driver instance are going to be put into the queue,
   *   so each following command will not be executed until the previous command
   *   execution is completed. False value disables that queue, so each driver command
   *   is executed independently and does not wait for anything.
   */
  get isCommandsQueueEnabled(): boolean {
    return true;
  }

  /*
   * make eventHistory a property and return a cloned object so a consumer can't
   * inadvertently change data outside of logEvent
   */
  get eventHistory() {
    return _.cloneDeep(this._eventHistory);
  }

  /**
   * API method for driver developers to log timings for important events
   */
  logEvent(eventName: string) {
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
   * @privateRemarks Overridden in appium driver, but here so that individual drivers can be
   * tested with clients that poll
   */
  async getStatus() {
    return {};
  }

  /**
   * method required by MJSONWP in order to determine whether it should
   * respond with an invalid session response
   */
  sessionExists(sessionId: string): boolean {
    if (!sessionId) return false; // eslint-disable-line curly
    return sessionId === this.sessionId;
  }

  /**
   * method required by MJSONWP in order to determine if the command should
   * be proxied directly to the driver
   */
  driverForSession(sessionId: string): Core<Constraints> | null {
    return this as Core<Constraints>;
  }

  isMjsonwpProtocol() {
    return this.protocol === PROTOCOLS.MJSONWP;
  }

  isW3CProtocol() {
    return this.protocol === PROTOCOLS.W3C;
  }

  setProtocolMJSONWP() {
    this.protocol = PROTOCOLS.MJSONWP;
  }

  setProtocolW3C() {
    this.protocol = PROTOCOLS.W3C;
  }

  /**
   * Check whether a given feature is enabled via its name
   *
   * @param name - name of feature/command
   */
  isFeatureEnabled(name: string): boolean {
    // automationName comparison is case-insensitive,
    // while feature name is case-sensitive
    const currentAutomationName = _.toLower(this.opts.automationName);

    const parseFullName = (fullName: string) => {
      const separatorPos = fullName.indexOf(FEATURE_NAME_SEPARATOR);
      if (separatorPos < 0) {
        // This should not happen as we preprocess corresponding server arguments in advance
        throw new Error(
          `The full feature name must include both the driver name/wildcard and the feature ` +
          `name split by a colon, got '${fullName}' instead`
        );
      }
      return [
        _.toLower(fullName.substring(0, separatorPos)),
        fullName.substring(separatorPos + 1)
      ];
    };
    const parseFullNames = (fullNames: string[]) => fullNames.map(parseFullName);
    const matches = ([automationName, featureName]: [string, string]) =>
      [currentAutomationName, ALL_DRIVERS_MATCH].includes(automationName) && featureName === name;

    // if we have explicitly denied this feature, return false immediately
    if (!_.isEmpty(this.denyInsecure) && parseFullNames(this.denyInsecure).some(matches)) {
      return false;
    }

    // if we specifically have allowed the feature, return true
    if (!_.isEmpty(this.allowInsecure) && parseFullNames(this.allowInsecure).some(matches)) {
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
   * @param name - name of feature/command
   * @deprecated Use {@link assertFeatureEnabled} instead
   */
  ensureFeatureEnabled(name: string) {
    this.assertFeatureEnabled(name);
  }

  /**
   * Assert that a given feature is enabled and throw a helpful error if it's
   * not
   *
   * @param name - name of feature/command
   */
  assertFeatureEnabled(name: string) {
    if (!this.isFeatureEnabled(name)) {
      throw new Error(
        `Potentially insecure feature '${name}' has not been ` +
          `enabled. If you want to enable this feature and accept ` +
          `the security ramifications, please do so by following ` +
          `the documented instructions at http://appium.io/docs/en/2.0/guides/security/`,
      );
    }
  }

  validateLocatorStrategy(strategy: string, webContext = false) {
    let validStrategies = this.locatorStrategies;
    this.log.debug(`Valid locator strategies for this request: ${validStrategies.join(', ')}`);

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
   * If this driver has requested proxying of bidi connections to an upstream bidi endpoint, this
   * method should be overridden to return the URL of that websocket, to indicate that bidi
   * proxying is enabled. Otherwise, a null return will indicate that bidi proxying should not be
   * active and bidi commands will be handled by this driver.
   *
   * @returns {string | null}
   */
  get bidiProxyUrl(): string | null {
    return null;
  }

  proxyActive(sessionId: string): boolean {
    return false;
  }

  getProxyAvoidList(sessionId: string): RouteMatcher[] {
    return [];
  }

  canProxy(sessionId: string): boolean {
    return false;
  }

  /**
   * Whether a given command route (expressed as method and url) should not be
   * proxied according to this driver
   *
   * @param sessionId - the current sessionId (in case the driver runs
   * multiple session ids and requires it). This is not used in this method but
   * should be made available to overridden methods.
   * @param method - HTTP method of the route
   * @param url - url of the route
   * @param [body] - webdriver request body
   *
   * @returns whether the route should be avoided
   */
  proxyRouteIsAvoided(sessionId: string, method: HTTPMethod, url: string, body?: any): boolean {
    for (const avoidSchema of this.getProxyAvoidList(sessionId)) {
      if (!_.isArray(avoidSchema) || avoidSchema.length !== 2) {
        throw new Error('Proxy avoidance must be a list of pairs');
      }
      const [avoidMethod, avoidPathRegex] = avoidSchema;
      if (!_.includes(['GET', 'POST', 'DELETE'], avoidMethod)) {
        throw new Error(`Unrecognized proxy avoidance method '${avoidMethod}'`);
      }
      if (!_.isRegExp(avoidPathRegex)) {
        throw new Error('Proxy avoidance path must be a regular expression');
      }
      const normalizedUrl = url.replace(new RegExp(`^${_.escapeRegExp(this.basePath)}`), '');
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
  addManagedDriver(driver: Driver) {
    this.managedDrivers.push(driver);
  }

  getManagedDrivers() {
    return this.managedDrivers;
  }

  async clearNewCommandTimeout() {
    if (this.noCommandTimer) {
      clearTimeout(this.noCommandTimer);
      this.noCommandTimer = null;
    }
  }

  async executeBidiCommand(bidiCmd: string, bidiParams: StringRecord): Promise<any> {
    const [moduleName, methodName] = bidiCmd.split('.');

    // if we don't get a valid format for bidi command name, reject
    if (!moduleName || !methodName) {
      throw new errors.UnknownCommandError(
        `Did not receive a valid BiDi module and method name ` +
          `of the form moduleName.methodName. Instead received ` +
          `'${moduleName}.${methodName}'`,
      );
    }

    // if the command module isn't part of our spec, reject
    if (!BIDI_COMMANDS[moduleName]) {
      throw new errors.UnknownCommandError();
    }

    const {command, params} = BIDI_COMMANDS[moduleName][methodName] as BidiMethodDef;
    // if the command method isn't part of our spec, also reject
    if (!command) {
      throw new errors.UnknownCommandError();
    }

    // If the driver doesn't have this command, it must not be implemented
    if (!this[command]) {
      throw new errors.NotYetImplementedError();
    }

    // TODO improve param parsing and error messages along the lines of what we have in the http
    // handlers
    const args: any[] = [];
    if (params?.required?.length) {
      for (const requiredParam of params.required) {
        if (_.isUndefined(bidiParams[requiredParam])) {
          throw new errors.InvalidArgumentError(
            `The ${requiredParam} parameter was required but you omitted it`,
          );
        }
        args.push(bidiParams[requiredParam]);
      }
    }
    if (params?.optional?.length) {
      for (const optionalParam of params.optional) {
        args.push(bidiParams[optionalParam]);
      }
    }
    const logParams = _.truncate(JSON.stringify(bidiParams), {length: MAX_LOG_BODY_LENGTH});
    this.log.debug(
      `Executing bidi command '${bidiCmd}' with params ${logParams} by passing to driver ` +
        `method '${command}'`,
    );
    const res = (await this[command](...args)) ?? null;
    this.log.debug(`Responding to bidi command '${bidiCmd}' with ${JSON.stringify(res)}`);
    return res;
  }
}
