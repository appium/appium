import os from 'node:os';

import {util} from '@appium/support';
import type {
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
} from '@appium/types';
import AsyncLock from 'async-lock';

import {DEFAULT_BASE_PATH, PROTOCOLS} from '../constants.js';
import {errors} from '../protocol/index.js';
import {DeviceSettings} from './device-settings.js';
import {ExtensionCore} from './extension-core.js';
import * as helpers from './helpers/index.js';

const NEW_COMMAND_TIMEOUT_MS = 60 * 1000;

const ON_UNEXPECTED_SHUTDOWN_EVENT = 'onUnexpectedShutdown';

const ALL_DRIVERS_MATCH = '*';
const FEATURE_NAME_SEPARATOR = ':';

export class DriverCore<const C extends Constraints, Settings extends StringRecord = StringRecord>
  extends ExtensionCore
  implements Core<C, Settings>
{
  /**
   * Make the basedriver version available so for any driver which inherits from this package, we
   * know which version of basedriver it inherited from
   */
  static baseVersion = helpers.BASEDRIVER_VER;

  sessionId: string | null = null;
  sessionCreationTimestampMs!: number;
  opts: DriverOpts<C>;
  initialOpts: InitialOpts;
  helpers: typeof helpers = helpers;
  /**
   * basePath is used for several purposes, for example in setting up
   * proxying to other drivers, since we need to know what the base path
   * of any incoming request might look like. We set it to the default
   * initially but it is automatically updated during any actual program
   * execution by the routeConfiguringFunction, which is necessarily run as
   * the entrypoint for any Appium server
   */
  basePath: string = DEFAULT_BASE_PATH;
  relaxedSecurityEnabled: boolean = false;
  allowInsecure: string[] = [];
  denyInsecure: string[] = [];
  newCommandTimeoutMs: number = NEW_COMMAND_TIMEOUT_MS;
  implicitWaitMs: number = 0;
  locatorStrategies: string[] = [];
  webLocatorStrategies: string[] = [];
  managedDrivers: Driver[] = [];
  noCommandTimer: NodeJS.Timeout | null = null;
  shutdownUnexpectedly: boolean = false;
  shouldValidateCaps: boolean;
  /**
   * settings should be instantiated by drivers which extend BaseDriver, but
   * we set it to an empty DeviceSettings instance here to make sure that the
   * default settings are applied even if an extending driver doesn't utilize
   * the settings functionality itself
   */
  settings: DeviceSettings<Settings> = new DeviceSettings();
  protocol?: Protocol;

  protected _eventHistory: EventHistory = {commands: []};
  protected commandsQueueGuard: AsyncLock = new AsyncLock();

  /**
   * @param opts - the initial driver options
   * @param shouldValidateCaps - whether capabilities should be validated on session creation
   */
  constructor(opts: InitialOpts = <InitialOpts>{}, shouldValidateCaps = true) {
    super();

    // setup state
    this.opts = opts as DriverOpts<C>;

    // use a custom tmp dir to avoid losing data and app when computer is
    // restarted
    this.opts.tmpDir = this.opts.tmpDir || process.env.APPIUM_TMP_DIR || os.tmpdir();

    // base-driver internals
    this.shouldValidateCaps = shouldValidateCaps;

    // keeping track of initial opts
    this.initialOpts = {...opts};
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

  /**
   * make eventHistory a property and return a cloned object so a consumer can't
   * inadvertently change data outside of logEvent
   */
  get eventHistory(): EventHistory {
    return structuredClone(this._eventHistory);
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

  /**
   * Set a callback handler if needed to execute a custom piece of code
   * when the driver is shut down unexpectedly. Multiple calls to this method
   * will cause the handler to be executed multiple times
   *
   * @param handler The code to be executed on unexpected shutdown.
   * The function may accept one argument, which is the actual error instance, which
   * caused the driver to shut down.
   */
  onUnexpectedShutdown(handler: (...args: any[]) => void): void {
    this.eventEmitter.on(ON_UNEXPECTED_SHUTDOWN_EVENT, handler);
  }

  /**
   * API method for driver developers to log timings for important events
   */
  logEvent(eventName: string): void {
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
  async getStatus(): Promise<any> {
    return {};
  }

  /**
   * method required by the protocol handler in order to determine whether it
   * should respond with an invalid session response
   */
  sessionExists(sessionId: string): boolean {
    if (!sessionId) {
      return false;
    }
    return sessionId === this.sessionId;
  }

  /**
   * method required by the protocol handler in order to determine if the
   * command should be proxied directly to the driver
   */
  driverForSession(sessionId: string): Core<Constraints> | null {
    void sessionId;
    return this as Core<Constraints>;
  }

  /**
   * Whether the current session is using the W3C WebDriver protocol
   */
  isW3CProtocol(): boolean {
    return this.protocol === PROTOCOLS.W3C;
  }

  /**
   * Mark the current session as using the W3C WebDriver protocol
   */
  setProtocolW3C(): void {
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
    const currentAutomationName = String(this.opts.automationName).toLowerCase();

    const parseFullName = (fullName: string) => {
      const separatorPos = fullName.indexOf(FEATURE_NAME_SEPARATOR);
      if (separatorPos <= 0) {
        // we do not expect this to happen as
        // arguments are validated upon server startup,
        // but better be safe than sorry
        throw new Error(
          `The full feature name must include both the automation name ` +
            `'${this.opts.automationName}' or the '${ALL_DRIVERS_MATCH}' ` +
            `wildcard to apply the feature to all installed drivers, and ` +
            `the feature name split by a colon. Got '${fullName}' instead`,
        );
      }
      return [fullName.substring(0, separatorPos).toLowerCase(), fullName.substring(separatorPos + 1)];
    };
    const parseFullNames = (fullNames: string[]) => fullNames.map(parseFullName);
    const matches = (pair: string[]) => {
      const [automationName, featureName] = pair;
      return [currentAutomationName, ALL_DRIVERS_MATCH].includes(automationName) && featureName === name;
    };

    // if we have explicitly denied this feature, return false immediately
    if (!util.isEmpty(this.denyInsecure) && parseFullNames(this.denyInsecure).some(matches)) {
      return false;
    }

    // if we specifically have allowed the feature, return true
    if (!util.isEmpty(this.allowInsecure) && parseFullNames(this.allowInsecure).some(matches)) {
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
   */
  assertFeatureEnabled(name: string): void {
    if (!this.isFeatureEnabled(name)) {
      throw new Error(
        `Potentially insecure feature '${name}' has not been ` +
          `enabled. If you want to enable this feature and accept ` +
          `the security ramifications, please do so by following ` +
          `the documented instructions at http://appium.io/docs/en/latest/guides/security/`,
      );
    }
  }

  /**
   * Assert that a given locator strategy is supported by this driver, and throw otherwise
   *
   * @param strategy - the locator strategy
   * @param webContext - whether the current context is a web context, in which case
   * `webLocatorStrategies` are also considered valid
   */
  validateLocatorStrategy(strategy: string, webContext = false): void {
    let validStrategies = this.locatorStrategies;
    this.log.debug(`Valid locator strategies for this request: ${validStrategies.join(', ')}`);

    if (webContext) {
      validStrategies = validStrategies.concat(this.webLocatorStrategies);
    }

    if (!validStrategies.includes(strategy)) {
      throw new errors.InvalidSelectorError(`Locator Strategy '${strategy}' is not supported for this session`);
    }
  }

  /**
   * Whether this driver is currently proxying commands for the given session to an upstream
   * server. Should be overridden by drivers which support proxying.
   *
   * @param sessionId - the current sessionId
   */
  proxyActive(sessionId: string): boolean {
    void sessionId;
    return false;
  }

  /**
   * The list of route/method pairs which should not be proxied even when {@linkcode proxyActive}
   * is true. Should be overridden by drivers which support proxying.
   *
   * @param sessionId - the current sessionId
   */
  getProxyAvoidList(sessionId: string): RouteMatcher[] {
    void sessionId;
    return [];
  }

  /**
   * Whether this driver is capable of proxying commands for the given session. Should be
   * overridden by drivers which support proxying.
   *
   * @param sessionId - the current sessionId
   */
  canProxy(sessionId: string): boolean {
    void sessionId;
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
    void body;
    for (const avoidSchema of this.getProxyAvoidList(sessionId)) {
      if (!Array.isArray(avoidSchema) || avoidSchema.length !== 2) {
        throw new Error('Proxy avoidance must be a list of pairs');
      }
      const [avoidMethod, avoidPathRegex] = avoidSchema;
      if (!['GET', 'POST', 'DELETE'].includes(avoidMethod)) {
        throw new Error(`Unrecognized proxy avoidance method '${avoidMethod}'`);
      }
      if (!(avoidPathRegex instanceof RegExp)) {
        throw new Error('Proxy avoidance path must be a regular expression');
      }
      const normalizedUrl = url.replace(new RegExp(`^${util.escapeRegExp(this.basePath)}`), '');
      if (avoidMethod === method && avoidPathRegex.test(normalizedUrl)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Register a driver managed by this driver (e.g. a driver spun up internally to handle a
   * sub-part of the automation), so that it can receive settings updates and be shut down
   * alongside the managing driver.
   *
   * @param driver - the managed driver instance
   */
  addManagedDriver(driver: Driver): void {
    this.managedDrivers.push(driver);
  }

  /**
   * @returns The list of drivers managed by this driver
   */
  getManagedDrivers(): Driver[] {
    return this.managedDrivers;
  }

  /**
   * Clear the New Command Timeout, if one is currently running
   */
  async clearNewCommandTimeout(): Promise<void> {
    if (this.noCommandTimer) {
      clearTimeout(this.noCommandTimer);
      this.noCommandTimer = null;
    }
  }
}
