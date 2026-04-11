import _ from 'lodash';
import type WebSocket from 'ws';
import type {
  AppiumServer,
  DriverCaps,
  DriverData,
  DriverOpts,
  ExternalDriver,
  Plugin,
  PluginClass,
  PluginCommand,
  Protocol,
  RouteMatcher,
  StringRecord,
  TimestampedMultiSessionData,
  W3CDriverCaps,
} from '@appium/types';
import {getBuildInfo, updateBuildInfo, APPIUM_VER} from './config';
import {
  BaseDriver,
  DriverCore,
  type ExtensionCore,
  errors,
  isSessionCommand,
  PROTOCOLS,
  CREATE_SESSION_COMMAND,
  DELETE_SESSION_COMMAND,
  GET_STATUS_COMMAND,
  LIST_DRIVER_COMMANDS_COMMAND,
  LIST_DRIVER_EXTENSIONS_COMMAND,
  promoteAppiumOptions,
  promoteAppiumOptionsForObject,
  generateDriverLogPrefix,
  isW3cCaps,
} from '@appium/base-driver';
import {
  parseCapsForInnerDriver,
  pullSettings,
  makeNonW3cCapsError,
  type ParsedDriverCaps,
} from './utils';
import {util} from '@appium/support';
import {getDefaultsForExtension} from './schema';
import {DRIVER_TYPE, BIDI_BASE_PATH, SESSION_DISCOVERY_FEATURE} from './constants';
import * as bidiCommands from './bidi-commands';
import * as insecureFeatures from './insecure-features';
import * as inspectorCommands from './inspector-commands';
import type {DriverConfig} from './extension/driver-config';

const desiredCapabilityConstraints = {
  automationName: {
    presence: true,
    isString: true,
  },
  platformName: {
    presence: true,
    isString: true,
  },
} as const;

export type AppiumDriverConstraints = typeof desiredCapabilityConstraints;
export type W3CAppiumDriverCaps = W3CDriverCaps<AppiumDriverConstraints>;

/** Result shape for umbrella {@link AppiumDriver.createSession} / {@link AppiumDriver.deleteSession}. */
interface SessionHandlerResult<V = unknown> {
  value?: V;
  error?: Error;
  protocol?: string;
}

type SessionHandlerCreateResult = SessionHandlerResult<
  [string, DriverCaps<AppiumDriverConstraints>, string | undefined]
>;

type SessionHandlerDeleteResult = SessionHandlerResult<void>;

/**
 * Umbrella driver: owns the session table, loads platform drivers and plugins, and routes
 * commands to the right session driver or plugin chain.
 */
export class AppiumDriver extends DriverCore<AppiumDriverConstraints> {
  readonly sessions: Record<string, ExternalDriver> = {};

  readonly pendingDrivers: Record<string, ExternalDriver[]> = {};

  /**
   * The umbrella driver does not observe its own command timeout; inner session drivers do.
   */
  override newCommandTimeoutMs = 0;

  /** Filled during server bootstrap; keep this map instance (do not reassign). */
  readonly pluginClasses = new Map<PluginClass, string>();

  readonly sessionPlugins: Record<string, Plugin[]> = {};

  sessionlessPlugins: Plugin[] = [];

  /** Set during server init before listen; tests may assign a mock after construction. */
  driverConfig!: DriverConfig;

  /** Set when the HTTP server is created in server bootstrap. */
  server!: AppiumServer;

  readonly bidiSockets: Record<string, WebSocket[]> = {};

  readonly bidiProxyClients: Record<string, WebSocket> = {};

  readonly desiredCapConstraints = desiredCapabilityConstraints;

  readonly args!: DriverOpts<AppiumDriverConstraints>;

  private _isShuttingDown = false;

  /**
   * @param opts - CLI/server options (address, port, security, default capabilities, etc.)
   */
  constructor(opts: DriverOpts<AppiumDriverConstraints>) {
    // It is necessary to set `--tmp` here since it should be set to
    // process.env.APPIUM_TMP_DIR once at an initial point in the Appium lifecycle.
    // The process argument will be referenced by BaseDriver.
    // Please call @appium/support.tempDir module to apply this benefit.
    if (opts.tmpDir) {
      process.env.APPIUM_TMP_DIR = opts.tmpDir;
    }

    super(opts);

    this.args = {...opts};

    // allow this to happen in the background, so no `await`
    void (async () => {
      try {
        await updateBuildInfo();
      } catch (e: unknown) {
        // make sure we catch any possible errors to avoid unhandled rejections
        const msg = e instanceof Error ? e.message : String(e);
        this.log.debug(`Cannot fetch Appium build info: ${msg}`);
      }
    })();
  }

  /** The umbrella driver does not queue commands; inner session drivers may. */
  get isCommandsQueueEnabled(): boolean {
    return false;
  }

  /** Whether a non-null session id is registered on this server. */
  override sessionExists(sessionId: string): boolean {
    const dstSession = this.sessions[sessionId];
    return Boolean(dstSession && dstSession.sessionId !== null);
  }

  /** Active automation driver for the session, or `null` if unknown. */
  override driverForSession(sessionId: string): ExternalDriver | null {
    return this.sessions[sessionId] ?? null;
  }

  /**
   * WebDriver status payload (readiness message and build metadata).
   * @see https://www.w3.org/TR/webdriver/#dfn-status
   */
  override async getStatus() {
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

  /** Marks the server as shutting down and ends all sessions (forced unexpected shutdown). */
  async shutdown(reason: string | null = null): Promise<void> {
    this._isShuttingDown = true;
    await this.deleteAllSessions({
      force: true,
      reason: reason ?? undefined,
    });
  }

  /**
   * Retrieve information about all active sessions.
   * Results are returned only if the `session_discovery` insecure feature is enabled.
   */
  async getAppiumSessions(): Promise<TimestampedMultiSessionData[]> {
    this.assertFeatureEnabled(SESSION_DISCOVERY_FEATURE);
    return _.toPairs(this.sessions).map(([id, driver]) => ({
      id,
      created: driver.sessionCreationTimestampMs,
      capabilities: driver.caps as DriverCaps<AppiumDriverConstraints>,
    }));
  }

  /** Logs BaseDriver version lines when starting a new inner-driver session. */
  printNewSessionAnnouncement(
    driverName: string,
    driverVersion?: string,
    driverBaseVersion?: string
  ): void {
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
   * CLI arguments object for a plugin (from server config). Empty object if none were passed.
   */
  getCliArgsForPlugin(extName: string): StringRecord {
    return (this.args.plugin?.[extName] ?? {}) as StringRecord;
  }

  /**
   * CLI arguments for a driver, omitting keys that match schema defaults (unlike
   * {@link AppiumDriver.getCliArgsForPlugin}, which returns defaults explicitly). `undefined` if
   * there is nothing to pass after omitting defaults.
   */
  getCliArgsForDriver(extName: string): StringRecord | undefined {
    const allCliArgsForExt = this.args.driver?.[extName] as StringRecord | undefined;
    if (_.isEmpty(allCliArgsForExt)) {
      return undefined;
    }

    const defaults = getDefaultsForExtension(DRIVER_TYPE, extName);
    const cliArgs = _.isEmpty(defaults)
      ? allCliArgsForExt
      : _.omitBy(allCliArgsForExt, (value, key) => _.isEqual(defaults[key], value));
    return _.isEmpty(cliArgs) ? undefined : cliArgs;
  }

  /**
   * Creates a session: picks an inner driver from caps, runs plugin hooks, and returns a protocol
   * envelope with either `[sessionId, caps, protocol]` or an error. Legacy call sites may pass the
   * same W3C caps in up to three positions; the first W3C-shaped value wins.
   */
  async createSession(
    w3cCapabilities1: W3CAppiumDriverCaps,
    w3cCapabilities2?: W3CAppiumDriverCaps,
    w3cCapabilities3?: W3CAppiumDriverCaps
  ): Promise<SessionHandlerCreateResult> {
    const defaultCapabilities = _.cloneDeep(this.args.defaultCapabilities);
    const defaultSettings = pullSettings((defaultCapabilities ?? {}) as StringRecord);
    const w3cCapabilities = _.cloneDeep(
      [w3cCapabilities3, w3cCapabilities2, w3cCapabilities1].find(isW3cCaps)
    );
    if (!w3cCapabilities) {
      throw makeNonW3cCapsError();
    }
    const w3cSettings = {
      ...defaultSettings,
      ...pullSettings(w3cCapabilities.alwaysMatch ?? {}),
    };
    for (const firstMatchEntry of w3cCapabilities.firstMatch ?? []) {
      Object.assign(w3cSettings, pullSettings(firstMatchEntry));
    }

    const protocol = PROTOCOLS.W3C;
    let innerSessionId: string;
    let dCaps: DriverCaps<AppiumDriverConstraints> & {webSocketUrl?: string | boolean};
    try {
      // Parse the caps into a format that the InnerDriver will accept
      const parsedCaps = parseCapsForInnerDriver<AppiumDriverConstraints>(
        promoteAppiumOptions(w3cCapabilities),
        this.desiredCapConstraints,
        defaultCapabilities ? promoteAppiumOptionsForObject(defaultCapabilities) : undefined
      );

      if ('error' in parsedCaps && parsedCaps.error) {
        throw parsedCaps.error;
      }
      const {desiredCaps, processedW3CCapabilities} =
        parsedCaps as ParsedDriverCaps<AppiumDriverConstraints>;

      const {
        driver: InnerDriver,
        version: driverVersion,
        driverName,
      } = await this.driverConfig.findMatchingDriver(desiredCaps);
      this.printNewSessionAnnouncement(InnerDriver.name, driverVersion, InnerDriver.baseVersion);

      if (this.args.sessionOverride) {
        await this.deleteAllSessions();
      }

      let runningDriversData: DriverData[] = [];
      let otherPendingDriversData: DriverData[] = [];

      const driverInstance = new InnerDriver(this.args, true) as unknown as ExternalDriver;

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
        (driverInstance as ExternalDriver & {cliArgs?: StringRecord}).cliArgs = cliArgs;
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
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new errors.SessionNotCreatedError(msg);
      }
      this.pendingDrivers[InnerDriver.name] = this.pendingDrivers[InnerDriver.name] || [];
      otherPendingDriversData = _.compact(
        this.pendingDrivers[InnerDriver.name].map((drv) => drv.driverData),
      );
      this.pendingDrivers[InnerDriver.name].push(driverInstance);

      try {
        [innerSessionId, dCaps] = (await driverInstance.createSession(
          processedW3CCapabilities as never,
          processedW3CCapabilities,
          processedW3CCapabilities,
          [...runningDriversData, ...otherPendingDriversData]
        )) as [string, DriverCaps<AppiumDriverConstraints> & {webSocketUrl?: string | boolean}];
        this.sessions[innerSessionId] = driverInstance;
      } finally {
        _.pull(this.pendingDrivers[InnerDriver.name], driverInstance);
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
    } catch (error: unknown) {
      return {
        protocol,
        error: error instanceof Error ? error : new Error(String(error)),
      };
    }

    return {
      protocol,
      value: [innerSessionId, dCaps, protocol],
    };
  }

  /**
   * Subscribes to the inner driver’s unexpected-shutdown hook so Appium can drop the session and
   * notify plugins.
   */
  attachUnexpectedShutdownHandler(driver: ExternalDriver, innerSessionId: string): void {
    const onShutdown = (cause: Error = new Error('Unknown error')) => {
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
   * Collects `driverData` for every active session whose driver class matches `InnerDriver.name`
   * (used when creating another session of the same driver type).
   * @remarks `InnerDriver` is expected to be the driver class; only `.name` is read.
   */
  async curSessionDataForDriver(InnerDriver: {name: string}): Promise<DriverData[]> {
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
   * Ends one session: removes it from the master list immediately, then delegates to the inner
   * driver’s `deleteSession` with sibling-session metadata.
   */
  async deleteSession(sessionId: string): Promise<SessionHandlerDeleteResult> {
    let protocol: Protocol | undefined;
    try {
      let otherSessionsData: DriverData[] | undefined;
      let dstSession: ExternalDriver | undefined;
      if (this.sessions[sessionId]) {
        const curConstructorName = this.sessions[sessionId].constructor.name;
        otherSessionsData = _.toPairs(this.sessions)
          .filter(
            ([key, value]) => value.constructor.name === curConstructorName && key !== sessionId,
          )
          .map(([, value]) => value.driverData);
        dstSession = this.sessions[sessionId];
        protocol = dstSession.protocol;
        this.log.info(`Removing session ${sessionId} from our master session list`);
        // regardless of whether the deleteSession completes successfully or not
        // make the session unavailable, because who knows what state it might
        // be in otherwise
        delete this.sessions[sessionId];
        delete this.sessionPlugins[sessionId];

        this.cleanupBidiSockets(sessionId);
      }
      // this may not be correct, but if `dstSession` was falsy, the call to `deleteSession()` would
      // throw anyway.
      if (!dstSession) {
        throw new Error('Session not found');
      }
      return {
        protocol,
        value: await dstSession.deleteSession(sessionId, otherSessionsData),
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.error(`Had trouble ending session ${sessionId}: ${msg}`);
      return {
        protocol,
        error: e instanceof Error ? e : new Error(msg),
      };
    }
  }

  /**
   * Ends every active session, either by normal `deleteSession` or by `startUnexpectedShutdown`
   * when `force` is true.
   */
  async deleteAllSessions(opts: {force?: boolean; reason?: string} = {}): Promise<void> {
    const sessionsCount = _.size(this.sessions);
    if (0 === sessionsCount) {
      this.log.debug('There are no active sessions for cleanup');
      return;
    }

    const {force = false, reason} = opts;
    this.log.debug(`Cleaning up ${util.pluralize('active session', sessionsCount, true)}`);
    const cleanupPromises = force
      ? _.values(this.sessions).map((drv) =>
          drv.startUnexpectedShutdown(reason ? new Error(reason) : undefined),
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
   * Plugin instances for a session id, or the shared sessionless list when `sessionId` is null.
   * Lazily builds sessionless instances on first use.
   */
  pluginsForSession(sessionId: string | null = null): Plugin[] {
    if (sessionId) {
      const driver = this.sessions[sessionId];
      return this.sessionPlugins[sessionId]
        ?? (driver ? this.createPluginInstances(generateDriverLogPrefix(driver)) : []);
    }

    if (_.isEmpty(this.sessionlessPlugins)) {
      this.sessionlessPlugins = this.createPluginInstances();
    }
    return this.sessionlessPlugins;
  }

  /**
   * Plugins that declare a method named `cmd` or a generic `handle` method, scoped to the given
   * session (or sessionless when `sessionId` is null).
   */
  pluginsToHandleCmd(cmd: string, sessionId: string | null = null): Plugin[] {
    // to handle a given command, a plugin should either implement that command as a plugin
    // instance method or it should implement a generic 'handle' method
    return this.pluginsForSession(sessionId).filter(
      (p) => _.isFunction(p[cmd]) || _.isFunction(p.handle),
    );
  }

  /**
   * One instance per registered plugin class. `driverId` becomes the plugin log prefix segment
   * when tied to a session driver; use `null` for sessionless plugins.
   */
  createPluginInstances(driverId: string | null = null): Plugin[] {
    const pluginInstances: Plugin[] = [];
    for (const [PluginClass, name] of this.pluginClasses.entries()) {
      const cliArgs = this.getCliArgsForPlugin(name);
      const plugin = new PluginClass(name, cliArgs, driverId);
      const extPlugin = plugin as Plugin & ExtensionCore;
      if (_.isFunction(extPlugin.updateBidiCommands)) {
        extPlugin.updateBidiCommands(PluginClass.newBidiCommands ?? {});
      }
      pluginInstances.push(plugin);
    }
    return pluginInstances;
  }

  /**
   * Dispatches a WebDriver/Appium command: may run on this driver, a session’s inner driver, or
   * through a plugin chain, and normalizes the return value into a protocol-shaped result.
   */
  async executeCommand(cmd: string, ...args: any[]): Promise<SessionHandlerResult<unknown>> {
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
    let sessionId: string | null = null;
    let dstSession: ExternalDriver | null = null;
    let protocol: string | null | undefined = null;
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    let driver: this | ExternalDriver = this;
    if (isSessionCmd) {
      sessionId = _.last(args) as string;
      dstSession = this.sessions[sessionId] ?? null;
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
    const cmdHandledBy: Record<string, boolean> = {default: false};

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

      if (!dstSession) {
        throw new Error('Internal error: session command without a session driver');
      }
      return await dstSession.executeCommand(cmd, ...args);
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
      const newSessionId = _.first(res.value as unknown[]) as string;
      this.log.info(
        `Promoting ${this.sessionlessPlugins.length} sessionless plugins to be attached ` +
          `to session ID ${newSessionId}`,
      );
      this.sessionPlugins[newSessionId] = this.sessionlessPlugins;
      const promoted = this.sessionPlugins[newSessionId] as (Plugin & ExtensionCore)[];
      for (const p of promoted) {
        if (_.isFunction(p.updateLogPrefix)) {
          p.updateLogPrefix(
            `${generateDriverLogPrefix(p)} <${generateDriverLogPrefix(this.sessions[newSessionId])}>`
          );
        }
      }
      this.sessionlessPlugins = [];
    }

    return res;
  }

  /** Builds an async chain: each plugin wraps `next` until the default driver behavior runs. */
  wrapCommandWithPlugins({
    driver,
    cmd,
    args,
    next,
    cmdHandledBy,
    plugins,
  }: {
    driver: AppiumDriver | ExternalDriver;
    cmd: string;
    args: any[];
    next: () => Promise<unknown>;
    cmdHandledBy: Record<string, boolean>;
    plugins: Plugin[];
  }): () => Promise<unknown> {
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
        const cmdHandler = (plugin as Plugin & Record<string, unknown>)[cmd];
        if (_.isFunction(cmdHandler)) {
          // Command methods must run with plugin as `this` (detached property access drops binding).
          return await (cmdHandler as PluginCommand).call(
            plugin,
            _next,
            driver as ExternalDriver,
            ...args,
          );
        }
        if (!_.isFunction(plugin.handle)) {
          throw new Error(`Plugin ${plugin.name} cannot handle command '${cmd}'`);
        }
        return await plugin.handle(_next, driver as ExternalDriver, cmd, ...args);
      })(next);
    }

    return next;
  }

  /** After a command with plugins, logs which handlers ran vs. were skipped (debugging aid). */
  logPluginHandlerReport(
    plugins: Plugin[],
    {cmd, cmdHandledBy}: {cmd: string; cmdHandledBy: Record<string, boolean>}
  ): void {
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

  /** Runs the wrapped plugin chain and merges the result into a `SessionHandlerResult` shape. */
  async executeWrappedCommand({
    wrappedCmd,
    protocol,
  }: {
    wrappedCmd: () => Promise<unknown>;
    protocol: string | null | undefined;
  }): Promise<SessionHandlerResult<unknown>> {
    let cmdRes: unknown;
    let cmdErr: unknown;
    const res: SessionHandlerResult<unknown> = {};
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
      Object.assign(res, cmdRes);
    } else {
      res.value = cmdRes;
      res.error = cmdErr instanceof Error ? cmdErr : undefined;
      res.protocol = protocol ?? undefined;
    }
    return res;
  }

  /** Whether the inner session driver is actively proxying for this session id. */
  override proxyActive(sessionId: string): boolean {
    const dstSession = this.sessions[sessionId];
    return dstSession && _.isFunction(dstSession.proxyActive) && dstSession.proxyActive(sessionId);
  }

  /** URL patterns the session driver does not want proxied; empty if no session or no list. */
  override getProxyAvoidList(sessionId: string): RouteMatcher[] {
    const dstSession = this.sessions[sessionId];
    return dstSession ? dstSession.getProxyAvoidList() : [];
  }

  /** Whether the session driver supports proxying for this session. */
  override canProxy(sessionId: string): boolean {
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

/** True if `cmd` should run on the umbrella driver instead of only on the session’s inner driver. */
function isAppiumDriverCommand(cmd: string): boolean {
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
  readonly code = 'APPIUMERR_NO_DRIVER_PROXYCOMMAND';

  constructor() {
    super(
      `The default behavior for this command was to proxy, but the driver ` +
        `did not have the 'proxyCommand' method defined. To fully support ` +
        `plugins, drivers should have 'proxyCommand' set to a jwpProxy object's ` +
        `'command()' method, in addition to the normal 'proxyReqRes'`,
    );
  }
}

