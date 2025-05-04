import _ from 'lodash';
import {getBuildInfo, updateBuildInfo, APPIUM_VER} from './config';
import {
  BaseDriver,
  DriverCore,
  errors,
  isSessionCommand,
  CREATE_SESSION_COMMAND,
  DELETE_SESSION_COMMAND,
  GET_STATUS_COMMAND,
  LIST_DRIVER_COMMANDS_COMMAND,
  LIST_DRIVER_EXTENSIONS_COMMAND,
  promoteAppiumOptions,
  promoteAppiumOptionsForObject,
  generateDriverLogPrefix,
} from '@appium/base-driver';
import AsyncLock from 'async-lock';
import {parseCapsForInnerDriver, pullSettings, makeNonW3cCapsError} from './utils';
import {util} from '@appium/support';
import {getDefaultsForExtension} from './schema';
import {DRIVER_TYPE, BIDI_BASE_PATH, SESSION_DISCOVERY_FEATURE} from './constants';
import * as bidiCommands from './bidi-commands';
import * as insecureFeatures from './insecure-features';
import * as inspectorCommands from './inspector-commands';

const desiredCapabilityConstraints = /** @type {const} */ ({
  automationName: {
    presence: true,
    isString: true,
  },
  platformName: {
    presence: true,
    isString: true,
  },
});

const sessionsListGuard = new AsyncLock();
const pendingDriversGuard = new AsyncLock();

/**
 * @extends {DriverCore<AppiumDriverConstraints>}
 */
class AppiumDriver extends DriverCore {
  /**
   * Access to sessions list must be guarded with a Semaphore, because
   * it might be changed by other async calls at any time
   * It is not recommended to access this property directly from the outside
   * @type {Record<string,ExternalDriver>}
   */
  sessions;

  /**
   * Access to pending drivers list must be guarded with a Semaphore, because
   * it might be changed by other async calls at any time
   * It is not recommended to access this property directly from the outside
   * @type {Record<string,ExternalDriver[]>}
   */
  pendingDrivers;

  /**
   * Note that {@linkcode AppiumDriver} has no `newCommandTimeout` method.
   * `AppiumDriver` does not set and observe its own timeouts; individual
   * sessions (managed drivers) do instead.
   */
  newCommandTimeoutMs;

  /**
   * List of active plugins
   * @type {Map<PluginClass,string>}
   */
  pluginClasses;

  /**
   * map of sessions to actual plugin instances per session
   * @type {Record<string,InstanceType<PluginClass>[]>}
   */
  sessionPlugins;

  /**
   * some commands are sessionless, so we need a set of plugins for them
   * @type {InstanceType<PluginClass>[]}
   */
  sessionlessPlugins;

  /** @type {DriverConfig} */
  driverConfig;

  /** @type {AppiumServer} */
  server;

  /** @type {Record<string, import('ws').WebSocket[]>} */
  bidiSockets;

  /** @type {Record<string, import('ws').WebSocket>} */
  bidiProxyClients;

  /**
   * @type {AppiumDriverConstraints}
   * @readonly
   */
  desiredCapConstraints;

  /** @type {import('@appium/types').DriverOpts<AppiumDriverConstraints>} */
  args;

  /**
   * @param {import('@appium/types').DriverOpts<AppiumDriverConstraints>} opts
   */
  constructor(opts) {
    // It is necessary to set `--tmp` here since it should be set to
    // process.env.APPIUM_TMP_DIR once at an initial point in the Appium lifecycle.
    // The process argument will be referenced by BaseDriver.
    // Please call @appium/support.tempDir module to apply this benefit.
    if (opts.tmpDir) {
      process.env.APPIUM_TMP_DIR = opts.tmpDir;
    }

    super(opts);

    this.args = {...opts};
    this.sessions = {};
    this.pendingDrivers = {};
    this.newCommandTimeoutMs = 0;
    this.pluginClasses = new Map();
    this.sessionPlugins = {};
    this.sessionlessPlugins = [];
    this.bidiSockets = {};
    this.bidiProxyClients = {};
    this.desiredCapConstraints = desiredCapabilityConstraints;
    this._isShuttingDown = false;

    // allow this to happen in the background, so no `await`
    (async () => {
      try {
        await updateBuildInfo();
      } catch (e) {
        // make sure we catch any possible errors to avoid unhandled rejections
        this.log.debug(`Cannot fetch Appium build info: ${e.message}`);
      }
    })();
  }

  /**
   * Cancel commands queueing for the umbrella Appium driver
   */
  get isCommandsQueueEnabled() {
    return false;
  }

  sessionExists(sessionId) {
    const dstSession = this.sessions[sessionId];
    return dstSession && dstSession.sessionId !== null;
  }

  driverForSession(sessionId) {
    return this.sessions[sessionId];
  }

  async getStatus() {
    // https://www.w3.org/TR/webdriver/#dfn-status
    const statusObj = this._isShuttingDown
      ? {
          ready: false,
          message: 'The server is shutting down',
        }
      : {
          ready: true,
          message: 'The server is ready to accept new connections',
        };
    return {
      ...statusObj,
      build: _.clone(getBuildInfo()),
    };
  }

  /**
   * @param {string|null} reason An optional shutdown reason
   */
  async shutdown(reason = null) {
    this._isShuttingDown = true;
    await this.deleteAllSessions({
      force: true,
      reason,
    });
  }

  /**
   * Retrieve information about all active sessions
   * @returns {Promise<import('@appium/types').MultiSessionData[]>}
   * @deprecated Use {@linkcode getAppiumSessions} instead
   */
  async getSessions() {
    return _.toPairs(this.sessions).map(([id, driver]) => ({
      id,
      capabilities: /** @type {import('@appium/types').DriverCaps<any>} */ (driver.caps),
    }));
  }

  /**
   * Retrieve information about all active sessions.
   * Results are returned only if the `session_discovery` insecure feature is enabled.
   * @returns {Promise<import('@appium/types').TimestampedMultiSessionData[]>}
   */
  async getAppiumSessions () {
    this.assertFeatureEnabled(SESSION_DISCOVERY_FEATURE);
    return _.toPairs(this.sessions).map(([id, driver]) => ({
      id,
      created: driver.sessionCreationTimestampMs,
      capabilities: /** @type {import('@appium/types').DriverCaps<any>} */ (driver.caps),
    }));
  }

  printNewSessionAnnouncement(driverName, driverVersion, driverBaseVersion) {
    this.log.info(
      driverVersion
        ? `Appium v${APPIUM_VER} creating new ${driverName} (v${driverVersion}) session`
        : `Appium v${APPIUM_VER} creating new ${driverName} session`,
    );
    this.log.info(`Checking BaseDriver versions for Appium and ${driverName}`);
    this.log.info(
      AppiumDriver.baseVersion
        ? `Appium's BaseDriver version is ${AppiumDriver.baseVersion}`
        : `Could not determine Appium's BaseDriver version`,
    );
    this.log.info(
      driverBaseVersion
        ? `${driverName}'s BaseDriver version is ${driverBaseVersion}`
        : `Could not determine ${driverName}'s BaseDriver version`,
    );
  }

  /**
   * Retrieves all CLI arguments for a specific plugin.
   * @param {string} extName - Plugin name
   * @returns {StringRecord} Arguments object. If none, an empty object.
   */
  getCliArgsForPlugin(extName) {
    return /** @type {StringRecord} */ (this.args.plugin?.[extName] ?? {});
  }

  /**
   * Retrieves CLI args for a specific driver.
   *
   * _Any arg which is equal to its default value will not be present in the returned object._
   *
   * _Note that this behavior currently (May 18 2022) differs from how plugins are handled_ (see {@linkcode AppiumDriver.getCliArgsForPlugin}).
   * @param {string} extName - Driver name
   * @returns {StringRecord|undefined} Arguments object. If none, `undefined`
   */
  getCliArgsForDriver(extName) {
    const allCliArgsForExt = /** @type {StringRecord|undefined} */ (this.args.driver?.[extName]);

    if (!_.isEmpty(allCliArgsForExt)) {
      const defaults = getDefaultsForExtension(DRIVER_TYPE, extName);
      const cliArgs = _.isEmpty(defaults)
        ? allCliArgsForExt
        : _.omitBy(allCliArgsForExt, (value, key) => _.isEqual(defaults[key], value));
      if (!_.isEmpty(cliArgs)) {
        return cliArgs;
      }
    }
  }

  /**
   * Create a new session
   * @param {W3CAppiumDriverCaps} jsonwpCaps JSONWP formatted desired capabilities
   * @param {W3CAppiumDriverCaps} [reqCaps] Required capabilities (JSONWP standard)
   * @param {W3CAppiumDriverCaps} [w3cCapabilities] W3C capabilities
   * @returns {Promise<SessionHandlerCreateResult>}
   */
  async createSession(jsonwpCaps, reqCaps, w3cCapabilities) {
    const defaultCapabilities = _.cloneDeep(this.args.defaultCapabilities);
    const defaultSettings = pullSettings(defaultCapabilities);
    jsonwpCaps = _.cloneDeep(jsonwpCaps);
    const jwpSettings = {...defaultSettings, ...pullSettings(jsonwpCaps)};
    w3cCapabilities = _.cloneDeep(w3cCapabilities);
    if (
      !_.isPlainObject(w3cCapabilities) ||
      !(_.isArray(w3cCapabilities?.firstMatch) || _.isPlainObject(w3cCapabilities?.alwaysMatch))
    ) {
      throw makeNonW3cCapsError();
    }
    // It is possible that the client only provides caps using JSONWP standard,
    // although firstMatch/alwaysMatch properties are still present.
    // In such case we assume the client understands W3C protocol and merge the given
    // JSONWP caps to W3C caps
    const w3cSettings = {
      ...jwpSettings,
      ...pullSettings((w3cCapabilities ?? {}).alwaysMatch ?? {}),
    };
    for (const firstMatchEntry of (w3cCapabilities ?? {}).firstMatch ?? []) {
      Object.assign(w3cSettings, pullSettings(firstMatchEntry));
    }

    /** @type {string|undefined} */
    let protocol;
    let innerSessionId, dCaps;
    try {
      // Parse the caps into a format that the InnerDriver will accept
      const parsedCaps = parseCapsForInnerDriver(
        jsonwpCaps,
        promoteAppiumOptions(/** @type {W3CAppiumDriverCaps} */ (w3cCapabilities)),
        this.desiredCapConstraints,
        defaultCapabilities ? promoteAppiumOptionsForObject(defaultCapabilities) : undefined,
      );

      const {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities} =
        /** @type {import('./utils').ParsedDriverCaps<AppiumDriverConstraints>} */ (parsedCaps);
      protocol = parsedCaps.protocol;
      const error = /** @type {import('./utils').InvalidCaps<AppiumDriverConstraints>} */ (
        parsedCaps
      ).error;
      // If the parsing of the caps produced an error, throw it in here
      if (error) {
        throw error;
      }

      const {
        driver: InnerDriver,
        version: driverVersion,
        driverName,
      } = await this.driverConfig.findMatchingDriver(desiredCaps);
      this.printNewSessionAnnouncement(InnerDriver.name, driverVersion, InnerDriver.baseVersion);

      if (this.args.sessionOverride) {
        await this.deleteAllSessions();
      }

      /**
       * @type {DriverData[]}
       */
      let runningDriversData = [];
      /**
       * @type {DriverData[]}
       */
      let otherPendingDriversData = [];

      const driverInstance = /** @type {ExternalDriver} */ (new InnerDriver(this.args, true));

      this.configureDriverFeatures(driverInstance, driverName);

      // We also want to assign any new Bidi Commands that the driver has specified, including all
      // the standard bidi commands. But add a method existence guard since some old driver class
      // instances might not have this method
      if (_.isFunction(driverInstance.updateBidiCommands)) {
        driverInstance.updateBidiCommands(InnerDriver.newBidiCommands ?? {});
      }

      // Likewise, any driver-specific CLI args that were passed in should be assigned directly to
      // the driver so that they cannot be mimicked by a malicious user sending in capabilities
      const cliArgs = this.getCliArgsForDriver(driverName);
      if (!_.isUndefined(cliArgs)) {
        driverInstance.cliArgs = cliArgs;
      }

      // This assignment is required for correct web sockets functionality inside the driver
      // Drivers/plugins might also want to know where they are hosted

      // XXX: temporary hack to work around #16747
      driverInstance.server = this.server;
      driverInstance.serverHost = this.args.address;
      driverInstance.serverPort = this.args.port;
      driverInstance.serverPath = this.args.basePath;

      try {
        runningDriversData = (await this.curSessionDataForDriver(InnerDriver)) ?? [];
      } catch (e) {
        throw new errors.SessionNotCreatedError(e.message);
      }
      await pendingDriversGuard.acquire(AppiumDriver.name, () => {
        this.pendingDrivers[InnerDriver.name] = this.pendingDrivers[InnerDriver.name] || [];
        otherPendingDriversData = _.compact(
          this.pendingDrivers[InnerDriver.name].map((drv) => drv.driverData),
        );
        this.pendingDrivers[InnerDriver.name].push(driverInstance);
      });

      try {
        [innerSessionId, dCaps] = await driverInstance.createSession(
          processedJsonwpCapabilities,
          reqCaps,
          processedW3CCapabilities,
          [...runningDriversData, ...otherPendingDriversData],
        );
        protocol = driverInstance.protocol;
        this.sessions[innerSessionId] = driverInstance;
      } finally {
        await pendingDriversGuard.acquire(AppiumDriver.name, () => {
          _.pull(this.pendingDrivers[InnerDriver.name], driverInstance);
        });
      }

      this.attachUnexpectedShutdownHandler(driverInstance, innerSessionId);

      this.log.info(
        `New ${InnerDriver.name} session created successfully, session ` +
          `${innerSessionId} added to master session list`,
      );

      // set the New Command Timeout for the inner driver
      await driverInstance.startNewCommandTimeout();

      // apply initial values to Appium settings (if provided)
      if (driverInstance.isW3CProtocol() && !_.isEmpty(w3cSettings)) {
        this.log.info(
          `Applying the initial values to Appium settings parsed from W3C caps: ` +
            JSON.stringify(w3cSettings),
        );
        await driverInstance.updateSettings(w3cSettings);
      } else if (driverInstance.isMjsonwpProtocol() && !_.isEmpty(jwpSettings)) {
        this.log.info(
          `Applying the initial values to Appium settings parsed from MJSONWP caps: ` +
            JSON.stringify(jwpSettings),
        );
        await driverInstance.updateSettings(jwpSettings);
      }

      // if the user has asked for bidi support, send our bidi url back to the user. The inner
      // driver will need to have already saved any internal bidi urls it might want to proxy to,
      // cause we are going to overwrite that information here!
      if (dCaps.webSocketUrl) {
        const {address, port, basePath} = this.args;
        const scheme = `ws${this.server.isSecure() ? 's' : ''}`;
        const host = bidiCommands.determineBiDiHost(address);
        const bidiUrl = `${scheme}://${host}:${port}${basePath}${BIDI_BASE_PATH}/${innerSessionId}`;
        this.log.info(
          `Upstream driver responded with webSocketUrl ${dCaps.webSocketUrl}, will rewrite to ` +
          `${bidiUrl} for response to client`
        );
        // @ts-ignore webSocketUrl gets sent by the client as a boolean, but then it is supposed
        // to come back from the server as a string. TODO figure out how to express this in our
        // capability constraint system
        dCaps.webSocketUrl = bidiUrl;
      }
    } catch (error) {
      return {
        protocol,
        error,
      };
    }

    return {
      protocol,
      value: [innerSessionId, dCaps, protocol],
    };
  }

  /**
   *
   * @param {ExternalDriver} driver
   * @param {string} innerSessionId
   */
  attachUnexpectedShutdownHandler(driver, innerSessionId) {
    const onShutdown = (cause = new Error('Unknown error')) => {
      this.log.warn(`Ending session, cause was '${cause.message}'`);

      if (this.sessionPlugins[innerSessionId]) {
        for (const plugin of this.sessionPlugins[innerSessionId]) {
          if (_.isFunction(plugin.onUnexpectedShutdown)) {
            this.log.debug(
              `Plugin ${plugin.name} defines an unexpected shutdown handler; calling it now`,
            );
            try {
              plugin.onUnexpectedShutdown(driver, cause);
            } catch (e) {
              this.log.warn(
                `Got an error when running plugin ${plugin.name} shutdown handler: ${e}`,
              );
            }
          } else {
            this.log.debug(`Plugin ${plugin.name} does not define an unexpected shutdown handler`);
          }
        }
      }

      this.log.info(`Removing session '${innerSessionId}' from our master session list`);
      delete this.sessions[innerSessionId];
      delete this.sessionPlugins[innerSessionId];
    };

    if (_.isFunction(driver.onUnexpectedShutdown)) {
      driver.onUnexpectedShutdown(onShutdown);
    } else {
      this.log.warn(
        `Failed to attach the unexpected shutdown listener. ` +
          `Is 'onUnexpectedShutdown' method available for '${driver.constructor.name}'?`,
      );
    }
  }

  /**
   *
   * @param {((...args: any[]) => any)|(new(...args: any[]) => any)} InnerDriver
   * @returns {Promise<DriverData[]>}}
   * @privateRemarks The _intent_ is that `InnerDriver` is the class of a driver, but it only really
   * needs to be a function or constructor.
   */
  async curSessionDataForDriver(InnerDriver) {
    const data = _.compact(
      _.values(this.sessions)
        .filter((s) => s.constructor.name === InnerDriver.name)
        .map((s) => s.driverData),
    );
    for (const datum of data) {
      if (!datum) {
        throw new Error(
          `Problem getting session data for driver type ` +
            `${InnerDriver.name}; does it implement 'get driverData'?`,
        );
      }
    }
    return data;
  }

  /**
   * @param {string} sessionId
   */
  async deleteSession(sessionId) {
    let protocol;
    try {
      let otherSessionsData;
      const dstSession = await sessionsListGuard.acquire(AppiumDriver.name, () => {
        if (!this.sessions[sessionId]) {
          return;
        }
        const curConstructorName = this.sessions[sessionId].constructor.name;
        otherSessionsData = _.toPairs(this.sessions)
          .filter(
            ([key, value]) => value.constructor.name === curConstructorName && key !== sessionId,
          )
          .map(([, value]) => value.driverData);
        const dstSession = this.sessions[sessionId];
        protocol = dstSession.protocol;
        this.log.info(`Removing session ${sessionId} from our master session list`);
        // regardless of whether the deleteSession completes successfully or not
        // make the session unavailable, because who knows what state it might
        // be in otherwise
        delete this.sessions[sessionId];
        delete this.sessionPlugins[sessionId];

        this.cleanupBidiSockets(sessionId);

        return dstSession;
      });
      // this may not be correct, but if `dstSession` was falsy, the call to `deleteSession()` would
      // throw anyway.
      if (!dstSession) {
        throw new Error('Session not found');
      }
      return {
        protocol,
        value: await dstSession.deleteSession(sessionId, otherSessionsData),
      };
    } catch (e) {
      this.log.error(`Had trouble ending session ${sessionId}: ${e.message}`);
      return {
        protocol,
        error: e,
      };
    }
  }

  async deleteAllSessions(opts = {}) {
    const sessionsCount = _.size(this.sessions);
    if (0 === sessionsCount) {
      this.log.debug('There are no active sessions for cleanup');
      return;
    }

    const {force = false, reason} = opts;
    this.log.debug(`Cleaning up ${util.pluralize('active session', sessionsCount, true)}`);
    const cleanupPromises = force
      ? _.values(this.sessions).map((drv) =>
          drv.startUnexpectedShutdown(reason && new Error(reason)),
        )
      : _.keys(this.sessions).map((id) => this.deleteSession(id));
    for (const cleanupPromise of cleanupPromises) {
      try {
        await cleanupPromise;
      } catch (e) {
        this.log.debug(e);
      }
    }
  }

  /**
   * Get the appropriate plugins for a session (or sessionless plugins)
   *
   * @param {?string} sessionId - the sessionId (or null) to use to find plugins
   * @returns {Array<import('@appium/types').Plugin>} - array of plugin instances
   */
  pluginsForSession(sessionId = null) {
    if (sessionId) {
      if (!this.sessionPlugins[sessionId]) {
        const driverId = generateDriverLogPrefix(this.sessions[sessionId]);
        this.sessionPlugins[sessionId] = this.createPluginInstances(driverId || null);
      }
      return this.sessionPlugins[sessionId];
    }

    if (_.isEmpty(this.sessionlessPlugins)) {
      this.sessionlessPlugins = this.createPluginInstances();
    }
    return this.sessionlessPlugins;
  }

  /**
   * To get plugins for a command, we either get the plugin instances associated with the
   * particular command's session, or in the case of sessionless plugins, pull from the set of
   * plugin instances reserved for sessionless commands (and we lazily create plugin instances on
   * first use)
   *
   * @param {string} cmd - the name of the command to find a plugin to handle
   * @param {?string} sessionId - the particular session for which to find a plugin, or null if
   * sessionless
   */
  pluginsToHandleCmd(cmd, sessionId = null) {
    // to handle a given command, a plugin should either implement that command as a plugin
    // instance method or it should implement a generic 'handle' method
    return this.pluginsForSession(sessionId).filter(
      (p) => _.isFunction(p[cmd]) || _.isFunction(p.handle),
    );
  }

  /**
   * Creates instances of all of the enabled Plugin classes
   * @param {string|null} driverId - ID to use for linking a driver to a plugin in logs
   * @returns {Plugin[]}
   */
  createPluginInstances(driverId = null) {
    /** @type {Plugin[]} */
    const pluginInstances = [];
    for (const [PluginClass, name] of this.pluginClasses.entries()) {
      const cliArgs = this.getCliArgsForPlugin(name);
      const plugin = new PluginClass(name, cliArgs, driverId);
      if (_.isFunction(/** @type {Plugin & ExtensionCore} */(plugin).updateBidiCommands)) {
        // some old plugin classes don't have `updateBidiCommands`
        /** @type {Plugin & ExtensionCore} */(plugin).updateBidiCommands(PluginClass.newBidiCommands ?? {});
      }
      pluginInstances.push(plugin);
    }
    return pluginInstances;
  }

  /**
   *
   * @param {string} cmd
   * @param  {...any} args
   * @returns {Promise<{value: any, error?: Error, protocol: string} | import('type-fest').AsyncReturnType<ExternalDriver['executeCommand']>>}
   */
  async executeCommand(cmd, ...args) {
    // We have basically three cases for how to handle commands:
    // 1. handle getStatus (we do this as a special out of band case so it doesn't get added to an
    //    execution queue, and can be called while e.g. createSession is in progress)
    // 2. handle commands that this umbrella driver should handle, rather than the actual session
    //    driver (for example, deleteSession, or other non-session commands)
    // 3. handle session driver commands.
    // The tricky part is that because we support command plugins, we need to wrap any of these
    // cases with plugin handling.

    const isGetStatus = cmd === GET_STATUS_COMMAND;
    const isUmbrellaCmd = isAppiumDriverCommand(cmd);
    const isSessionCmd = isSessionCommand(cmd);

    // if a plugin override proxying for this command and that is why we are here instead of just
    // letting the protocol proxy the command entirely, determine that, get the request object for
    // use later on, then clean up the args
    const reqForProxy = _.last(args)?.reqForProxy;
    if (reqForProxy) {
      args.pop();
    }

    // first do some error checking. If we're requesting a session command execution, then make
    // sure that session actually exists on the session driver, and set the session driver itself
    let sessionId = null;
    let dstSession = null;
    let protocol = null;
    /** @type {this | ExternalDriver} */
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let driver = this;
    if (isSessionCmd) {
      sessionId = _.last(args);
      dstSession = this.sessions[sessionId];
      if (!dstSession) {
        throw new Error(`The session with id '${sessionId}' does not exist`);
      }
      // now save the response protocol given that the session driver's protocol might differ
      protocol = dstSession.protocol;
      if (!isUmbrellaCmd) {
        driver = dstSession;
      }
    }

    // get any plugins which are registered as handling this command
    const plugins = this.pluginsToHandleCmd(cmd, sessionId);

    // if any plugins are going to handle this command, we can't guarantee that the default
    // driver's executeCommand method will be called, which means we can't guarantee that the
    // newCommandTimeout will be cleared. So we do it here as well.
    if (plugins.length && dstSession) {
      this.log.debug(
        'Clearing new command timeout pre-emptively since plugin(s) will handle this command',
      );
      await dstSession.clearNewCommandTimeout();
    }

    // now we define a 'cmdHandledBy' object which will keep track of which plugins have handled this
    // command. we care about this because (a) multiple plugins can handle the same command, and
    // (b) there's no guarantee that a plugin will actually call the next() method which runs the
    // original command execution. This results in a situation where the command might be handled
    // by some but not all plugins, or by plugin(s) but not by the default behavior. So start out
    // this object declaring that the default handler has not been executed.
    const cmdHandledBy = {default: false};

    // now we define an async function which will be passed to plugins, and successively wrapped
    // if there is more than one plugin that can handle the command. To start off with, the async
    // function is defined as calling the default behavior, i.e., whichever of the 3 cases above is
    // the appropriate one
    const defaultBehavior = async () => {
      // if we're running with plugins, make sure we log that the default behavior is actually
      // happening so we can tell when the plugin call chain is unwrapping to the default behavior
      // if that's what happens
      if (plugins.length) {
        this.log.info(`Executing default handling behavior for command '${cmd}'`);
      }

      // if we make it here, we know that the default behavior is handled
      cmdHandledBy.default = true;

      if (reqForProxy) {
        // we would have proxied this command had a plugin not handled it, so the default behavior
        // is to do the proxy and retrieve the result internally so it can be passed to the plugin
        // in case it calls 'await next()'. This requires that the driver have defined
        // 'proxyCommand' and not just 'proxyReqRes'.
        if (!dstSession?.proxyCommand) {
          throw new NoDriverProxyCommandError();
        }
        return await dstSession.proxyCommand(
          reqForProxy.originalUrl,
          reqForProxy.method,
          reqForProxy.body,
        );
      }

      if (isGetStatus) {
        return await this.getStatus();
      }

      if (isUmbrellaCmd) {
        // some commands, like deleteSession, we want to make sure to handle on *this* driver,
        // not the platform driver
        return await BaseDriver.prototype.executeCommand.call(this, cmd, ...args);
      }

      // here we know that we are executing a session command, and have a valid session driver
      return await /** @type {any} */ (dstSession).executeCommand(cmd, ...args);
    };

    // now take our default behavior, wrap it with any number of plugin behaviors, and run it
    const wrappedCmd = this.wrapCommandWithPlugins({
      driver,
      cmd,
      args,
      plugins,
      cmdHandledBy,
      next: defaultBehavior,
    });
    const res = await this.executeWrappedCommand({wrappedCmd, protocol});

    // if we had plugins, make sure to log out the helpful report about which plugins ended up
    // handling the command and which didn't
    this.logPluginHandlerReport(plugins, {cmd, cmdHandledBy});

    // if we had plugins, and if they did not ultimately call the default handler, this means our
    // new command timeout was not restarted by the default handler's executeCommand call, so
    // restart it here using the same logic as in BaseDriver's executeCommand
    if (
      dstSession &&
      !cmdHandledBy.default &&
      dstSession.isCommandsQueueEnabled &&
      cmd !== DELETE_SESSION_COMMAND
    ) {
      this.log.debug(
        'Restarting new command timeout via umbrella driver since plugin did not ' +
          'allow default handler to execute',
      );
      await dstSession.startNewCommandTimeout();
    }

    // And finally, if the command was createSession, we want to migrate any plugins which were
    // previously sessionless to use the new sessionId, so that plugins can share state between
    // their createSession method and other instance methods
    if (cmd === CREATE_SESSION_COMMAND && this.sessionlessPlugins.length && !res.error) {
      const sessionId = _.first(res.value);
      this.log.info(
        `Promoting ${this.sessionlessPlugins.length} sessionless plugins to be attached ` +
          `to session ID ${sessionId}`,
      );
      this.sessionPlugins[sessionId] = this.sessionlessPlugins;
      for (const p of /** @type {(Plugin & ExtensionCore)[]} */(this.sessionPlugins[sessionId])) {
        if (_.isFunction(p.updateLogPrefix)) {
          // some old plugin classes don't have `updateLogPrefix` yet
          p.updateLogPrefix(`${generateDriverLogPrefix(p)} <${generateDriverLogPrefix(this.sessions[sessionId])}>`);
        }
      }
      this.sessionlessPlugins = [];
    }

    return res;
  }

  wrapCommandWithPlugins({driver, cmd, args, next, cmdHandledBy, plugins}) {
    if (plugins.length) {
      this.log.info(`Plugins which can handle cmd '${cmd}': ${plugins.map((p) => p.name)}`);
    }

    // now we can go through each plugin and wrap `next` around its own handler, passing the *old*
    // next in so that it can call it if it wants to
    for (const plugin of plugins) {
      // need an IIFE here because we want the value of next that's passed to plugin.handle to be
      // exactly the value of next here before reassignment; we don't want it to be lazily
      // evaluated, otherwise we end up with infinite recursion of the last `next` to be defined.
      cmdHandledBy[plugin.name] = false; // we see a new plugin, so add it to the 'cmdHandledBy' object
      next = ((_next) => async () => {
        this.log.info(`Plugin ${plugin.name} is now handling cmd '${cmd}'`);
        cmdHandledBy[plugin.name] = true; // if we make it here, this plugin has attempted to handle cmd
        // first attempt to handle the command via a command-specific handler on the plugin
        if (plugin[cmd]) {
          return await plugin[cmd](_next, driver, ...args);
        }
        // otherwise, call the generic 'handle' method
        return await plugin.handle(_next, driver, cmd, ...args);
      })(next);
    }

    return next;
  }

  logPluginHandlerReport(plugins, {cmd, cmdHandledBy}) {
    if (!plugins.length) {
      return;
    }

    // at the end of the day, we have an object representing which plugins ended up getting
    // their code run as part of handling this command. Because plugins can choose *not* to
    // pass control to other plugins or to the default driver behavior, this is information
    // which is probably useful to the user (especially in situations where plugins might not
    // interact well together, and it would be hard to debug otherwise without this kind of
    // message).
    const didHandle = Object.keys(cmdHandledBy).filter((k) => cmdHandledBy[k]);
    const didntHandle = Object.keys(cmdHandledBy).filter((k) => !cmdHandledBy[k]);
    if (didntHandle.length > 0) {
      this.log.info(
        `Command '${cmd}' was *not* handled by the following behaviours or plugins, even ` +
          `though they were registered to handle it: ${JSON.stringify(didntHandle)}. The ` +
          `command *was* handled by these: ${JSON.stringify(didHandle)}.`,
      );
    }
  }

  async executeWrappedCommand({wrappedCmd, protocol}) {
    let cmdRes,
      cmdErr,
      res = {};
    try {
      // At this point, `wrappedCmd` defines a whole sequence of plugin handlers, culminating in
      // our default handler. Whatever it returns is what we're going to want to send back to the
      // user.
      cmdRes = await wrappedCmd();
    } catch (e) {
      cmdErr = e;
    }

    // Sadly, we don't know exactly what kind of object will be returned. It will either be a bare
    // object, or a protocol-aware object with protocol and error/value keys. So we need to sniff
    // it and make sure we don't double-wrap it if it's the latter kind.
    if (_.isPlainObject(cmdRes) && _.has(cmdRes, 'protocol')) {
      res = cmdRes;
    } else {
      res.value = cmdRes;
      res.error = cmdErr;
      res.protocol = protocol;
    }
    return res;
  }

  proxyActive(sessionId) {
    const dstSession = this.sessions[sessionId];
    return dstSession && _.isFunction(dstSession.proxyActive) && dstSession.proxyActive(sessionId);
  }

  /**
   *
   * @param {string} sessionId
   * @returns {import('@appium/types').RouteMatcher[]}
   */
  getProxyAvoidList(sessionId) {
    const dstSession = this.sessions[sessionId];
    return dstSession ? dstSession.getProxyAvoidList() : [];
  }

  canProxy(sessionId) {
    const dstSession = this.sessions[sessionId];
    return dstSession && dstSession.canProxy(sessionId);
  }

  onBidiConnection = bidiCommands.onBidiConnection;
  onBidiMessage = bidiCommands.onBidiMessage;
  onBidiServerError = bidiCommands.onBidiServerError;
  cleanupBidiSockets = bidiCommands.cleanupBidiSockets;

  configureGlobalFeatures = insecureFeatures.configureGlobalFeatures;
  configureDriverFeatures = insecureFeatures.configureDriverFeatures;

  listCommands = inspectorCommands.listCommands;
  listExtensions = inspectorCommands.listExtensions;
}

/**
 * Help decide which commands should be proxied to sub-drivers and which
 * should be handled by this, our umbrella driver
 * @param {string} cmd
 * @returns {boolean}
 */
function isAppiumDriverCommand(cmd) {
  return !isSessionCommand(cmd)
    || _.includes([
      DELETE_SESSION_COMMAND,
      LIST_DRIVER_COMMANDS_COMMAND,
      LIST_DRIVER_EXTENSIONS_COMMAND,
    ], cmd);
}

/**
 * Thrown when Appium tried to proxy a command using a driver's `proxyCommand` method but the
 * method did not exist
 */
export class NoDriverProxyCommandError extends Error {
  /**
   * @type {Readonly<string>}
   */
  code = 'APPIUMERR_NO_DRIVER_PROXYCOMMAND';

  constructor() {
    super(
      `The default behavior for this command was to proxy, but the driver ` +
        `did not have the 'proxyCommand' method defined. To fully support ` +
        `plugins, drivers should have 'proxyCommand' set to a jwpProxy object's ` +
        `'command()' method, in addition to the normal 'proxyReqRes'`,
    );
  }
}

export {AppiumDriver};

/**
 * @typedef {import('@appium/types').DriverData} DriverData
 * @typedef {import('@appium/types').ServerArgs} DriverOpts
 * @typedef {import('@appium/types').Constraints} Constraints
 * @typedef {import('@appium/types').AppiumServer} AppiumServer
 * @typedef {import('@appium/types').ExtensionType} ExtensionType
 * @typedef {import('./extension/driver-config').DriverConfig} DriverConfig
 * @typedef {import('@appium/types').PluginType} PluginType
 * @typedef {import('@appium/types').DriverType} DriverType
 * @typedef {import('@appium/types').StringRecord} StringRecord
 * @typedef {import('@appium/types').ExternalDriver} ExternalDriver
 * @typedef {import('@appium/types').PluginClass} PluginClass
 * @typedef {import('@appium/types').Plugin} Plugin
 * @typedef {import('@appium/base-driver').ExtensionCore} ExtensionCore
 * @typedef {import('@appium/types').DriverClass<import('@appium/types').Driver>} DriverClass
 */

/**
 * @typedef {import('@appium/types').ISessionHandler<AppiumDriverConstraints,
 * SessionHandlerCreateResult, SessionHandlerDeleteResult>} AppiumSessionHandler
 */

/**
 * @typedef {SessionHandlerResult<[innerSessionId: string, caps:
 * import('@appium/types').DriverCaps<Constraints>, protocol: string|undefined]>} SessionHandlerCreateResult
 */

/**
 * @template {Constraints} C
 * @typedef {import('@appium/types').Core<C>} Core
 */

/**
 * @typedef {SessionHandlerResult<void>} SessionHandlerDeleteResult
 */

/**
 * Used by {@linkcode AppiumDriver.createSession} and {@linkcode AppiumDriver.deleteSession} to describe
 * result.
 * @template V
 * @typedef SessionHandlerResult
 * @property {V} [value]
 * @property {Error} [error]
 * @property {string} [protocol]
 */

/**
 * @typedef {typeof desiredCapabilityConstraints} AppiumDriverConstraints
 * @typedef {import('@appium/types').W3CDriverCaps<AppiumDriverConstraints>} W3CAppiumDriverCaps
 */
