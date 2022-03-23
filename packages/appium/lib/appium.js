import _ from 'lodash';
import { getBuildInfo, updateBuildInfo, APPIUM_VER } from './config';
import { BaseDriver, errors, isSessionCommand,
         CREATE_SESSION_COMMAND, DELETE_SESSION_COMMAND, GET_STATUS_COMMAND
} from '@appium/base-driver';
import AsyncLock from 'async-lock';
import { parseCapsForInnerDriver, pullSettings } from './utils';
import { util, node, logger } from '@appium/support';
import { getDefaultsForExtension } from './schema';

const desiredCapabilityConstraints = {
  automationName: {
    presence: true,
    isString: true,
  },
  platformName: {
    presence: true,
    isString: true,
  },
};

const sessionsListGuard = new AsyncLock();
const pendingDriversGuard = new AsyncLock();

class AppiumDriver extends BaseDriver {
  constructor (args) {
    // It is necessary to set `--tmp` here since it should be set to
    // process.env.APPIUM_TMP_DIR once at an initial point in the Appium lifecycle.
    // The process argument will be referenced by BaseDriver.
    // Please call @appium/support.tempDir module to apply this benefit.
    if (args.tmpDir) {
      process.env.APPIUM_TMP_DIR = args.tmpDir;
    }

    super(args);

    this.desiredCapConstraints = desiredCapabilityConstraints;

    // the main Appium Driver has no new command timeout
    this.newCommandTimeoutMs = 0;

    this.args = {...args};

    // Access to sessions list must be guarded with a Semaphore, because
    // it might be changed by other async calls at any time
    // It is not recommended to access this property directly from the outside
    this.sessions = {};

    // Access to pending drivers list must be guarded with a Semaphore, because
    // it might be changed by other async calls at any time
    // It is not recommended to access this property directly from the outside
    this.pendingDrivers = {};

    /** @type {PluginExtensionClass[]} */
    this.pluginClasses = []; // list of which plugins are active
    this.sessionPlugins = {}; // map of sessions to actual plugin instances per session
    this.sessionlessPlugins = []; // some commands are sessionless, so we need a set of plugins for them

    // allow this to happen in the background, so no `await`
    updateBuildInfo();
  }

  /**
   * Retrieves logger instance for the current umbrella driver instance
   * @override
   */
  get log () {
    if (!this._log) {
      const instanceName = `${this.constructor.name}@${node.getObjectId(this).substring(0, 4)}`;
      this._log = logger.getLogger(instanceName);
    }
    return this._log;
  }

  /** @type {import('./extension/driver-config').DriverConfig|undefined} */
  driverConfig;

  /** @type {import('express').Express|undefined} */
  server;

  /**
   * Cancel commands queueing for the umbrella Appium driver
   */
  get isCommandsQueueEnabled () {
    return false;
  }

  sessionExists (sessionId) {
    const dstSession = this.sessions[sessionId];
    return dstSession && dstSession.sessionId !== null;
  }

  driverForSession (sessionId) {
    return this.sessions[sessionId];
  }

  async getStatus () { // eslint-disable-line require-await
    return {
      build: _.clone(getBuildInfo()),
    };
  }

  async getSessions () {
    const sessions = await sessionsListGuard.acquire(AppiumDriver.name, () => this.sessions);
    return _.toPairs(sessions)
      .map(([id, driver]) => ({id, capabilities: driver.caps}));
  }

  printNewSessionAnnouncement (driverName, driverVersion, driverBaseVersion) {
    this.log.info(driverVersion
      ? `Appium v${APPIUM_VER} creating new ${driverName} (v${driverVersion}) session`
      : `Appium v${APPIUM_VER} creating new ${driverName} session`
    );
    this.log.info(`Checking BaseDriver versions for Appium and ${driverName}`);
    this.log.info(AppiumDriver.baseVersion
      ? `Appium's BaseDriver version is ${AppiumDriver.baseVersion}`
      : `Could not determine Appium's BaseDriver version`
    );
    this.log.info(driverBaseVersion
      ? `${driverName}'s BaseDriver version is ${driverBaseVersion}`
      : `Could not determine ${driverName}'s BaseDriver version`
    );
  }

  /**
   * Validate and assign CLI args for a driver or plugin
   *
   * If the extension has provided a schema, validation has already happened.
   *
   * Any arg which is equal to its default value will not be assigned to the extension.
   * @param {import('./manifest').ExtensionType} extType 'driver' or 'plugin'
   * @param {string} extName the name of the extension
   * @param {Object} extInstance the driver or plugin instance
   */
  assignCliArgsToExtension (extType, extName, extInstance) {
    const allCliArgsForExt = this.args[extType]?.[extName];
    if (!_.isEmpty(allCliArgsForExt)) {
      const defaults = getDefaultsForExtension(extType, extName);
      const cliArgs = _.isEmpty(defaults)
        ? allCliArgsForExt
        : _.omitBy(allCliArgsForExt, (value, key) => _.isEqual(defaults[key], value));
      if (!_.isEmpty(cliArgs)) {
        extInstance.cliArgs = cliArgs;
      }
    }
  }

  /**
   * Create a new session
   * @param {Object} jsonwpCaps JSONWP formatted desired capabilities
   * @param {Object} reqCaps Required capabilities (JSONWP standard)
   * @param {Object} w3cCapabilities W3C capabilities
   * @return {Array} Unique session ID and capabilities
   */
  async createSession (jsonwpCaps, reqCaps, w3cCapabilities) {
    const defaultCapabilities = _.cloneDeep(this.args.defaultCapabilities);
    const defaultSettings = pullSettings(defaultCapabilities);
    jsonwpCaps = _.cloneDeep(jsonwpCaps);
    const jwpSettings = Object.assign({}, defaultSettings, pullSettings(jsonwpCaps));
    w3cCapabilities = _.cloneDeep(w3cCapabilities);
    // It is possible that the client only provides caps using JSONWP standard,
    // although firstMatch/alwaysMatch properties are still present.
    // In such case we assume the client understands W3C protocol and merge the given
    // JSONWP caps to W3C caps
    const w3cSettings = Object.assign({}, jwpSettings);
    Object.assign(w3cSettings, pullSettings((w3cCapabilities || {}).alwaysMatch || {}));
    for (const firstMatchEntry of ((w3cCapabilities || {}).firstMatch || [])) {
      Object.assign(w3cSettings, pullSettings(firstMatchEntry));
    }

    let protocol;
    let innerSessionId, dCaps;
    try {
      // Parse the caps into a format that the InnerDriver will accept
      const parsedCaps = parseCapsForInnerDriver(
        jsonwpCaps,
        w3cCapabilities,
        this.desiredCapConstraints,
        defaultCapabilities
      );

      const {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities, error} = parsedCaps;
      protocol = parsedCaps.protocol;

      // If the parsing of the caps produced an error, throw it in here
      if (error) {
        throw error;
      }

      const {
        driver: InnerDriver,
        version: driverVersion,
        driverName
      } = this.driverConfig.findMatchingDriver(desiredCaps);
      this.printNewSessionAnnouncement(InnerDriver.name, driverVersion, InnerDriver.baseVersion);

      if (this.args.sessionOverride) {
        await this.deleteAllSessions();
      }

      let runningDriversData, otherPendingDriversData;

      const driverInstance = new InnerDriver(this.args, true);

      // We want to assign security values directly on the driver. The driver
      // should not read security values from `this.opts` because those values
      // could have been set by a malicious user via capabilities, whereas we
      // want a guarantee the values were set by the appium server admin
      if (this.args.relaxedSecurityEnabled) {
        this.log.info(`Applying relaxed security to '${InnerDriver.name}' as per ` +
          `server command line argument. All insecure features will be ` +
          `enabled unless explicitly disabled by --deny-insecure`);
        driverInstance.relaxedSecurityEnabled = true;
      }

      if (!_.isEmpty(this.args.denyInsecure)) {
        this.log.info('Explicitly preventing use of insecure features:');
        this.args.denyInsecure.map((a) => this.log.info(`    ${a}`));
        driverInstance.denyInsecure = this.args.denyInsecure;
      }

      if (!_.isEmpty(this.args.allowInsecure)) {
        this.log.info('Explicitly enabling use of insecure features:');
        this.args.allowInsecure.map((a) => this.log.info(`    ${a}`));
        driverInstance.allowInsecure = this.args.allowInsecure;
      }

      // Likewise, any driver-specific CLI args that were passed in should be assigned directly to
      // the driver so that they cannot be mimicked by a malicious user sending in capabilities
      this.assignCliArgsToExtension('driver', driverName, driverInstance);


      // This assignment is required for correct web sockets functionality inside the driver
      driverInstance.server = this.server;

      // Drivers/plugins might also want to know where they are hosted
      driverInstance.serverHost = this.args.address;
      driverInstance.serverPort = this.args.port;
      driverInstance.serverPath = this.args.basePath;

      try {
        runningDriversData = await this.curSessionDataForDriver(InnerDriver);
      } catch (e) {
        throw new errors.SessionNotCreatedError(e.message);
      }
      await pendingDriversGuard.acquire(AppiumDriver.name, () => {
        this.pendingDrivers[InnerDriver.name] = this.pendingDrivers[InnerDriver.name] || [];
        otherPendingDriversData = this.pendingDrivers[InnerDriver.name].map((drv) => drv.driverData);
        this.pendingDrivers[InnerDriver.name].push(driverInstance);
      });

      try {
        [innerSessionId, dCaps] = await driverInstance.createSession(
          processedJsonwpCapabilities,
          reqCaps,
          processedW3CCapabilities,
          [...runningDriversData, ...otherPendingDriversData]
        );
        protocol = driverInstance.protocol;
        await sessionsListGuard.acquire(AppiumDriver.name, () => {
          this.sessions[innerSessionId] = driverInstance;
        });
      } finally {
        await pendingDriversGuard.acquire(AppiumDriver.name, () => {
          _.pull(this.pendingDrivers[InnerDriver.name], driverInstance);
        });
      }

      this.attachUnexpectedShutdownHandler(driverInstance, innerSessionId);

      this.log.info(`New ${InnerDriver.name} session created successfully, session ` +
        `${innerSessionId} added to master session list`);

      // set the New Command Timeout for the inner driver
      driverInstance.startNewCommandTimeout();

      // apply initial values to Appium settings (if provided)
      if (driverInstance.isW3CProtocol() && !_.isEmpty(w3cSettings)) {
        this.log.info(`Applying the initial values to Appium settings parsed from W3C caps: ` +
          JSON.stringify(w3cSettings));
        await driverInstance.updateSettings(w3cSettings);
      } else if (driverInstance.isMjsonwpProtocol() && !_.isEmpty(jwpSettings)) {
        this.log.info(`Applying the initial values to Appium settings parsed from MJSONWP caps: ` +
          JSON.stringify(jwpSettings));
        await driverInstance.updateSettings(jwpSettings);
      }
    } catch (error) {
      return {
        protocol,
        error,
      };
    }

    return {
      protocol,
      value: [innerSessionId, dCaps, protocol]
    };
  }

  attachUnexpectedShutdownHandler (driver, innerSessionId) {
    const onShutdown = (cause = new Error('Unknown error')) => {
      this.log.warn(`Ending session, cause was '${cause.message}'`);

      if (this.sessionPlugins[innerSessionId]) {
        for (const plugin of this.sessionPlugins[innerSessionId]) {
          if (_.isFunction(plugin.onUnexpectedShutdown)) {
            this.log.debug(`Plugin ${plugin.name} defines an unexpected shutdown handler; calling it now`);
            try {
              plugin.onUnexpectedShutdown(driver, cause);
            } catch (e) {
              this.log.warn(`Got an error when running plugin ${plugin.name} shutdown handler: ${e}`);
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
      this.log.warn(`Failed to attach the unexpected shutdown listener. ` +
        `Is 'onUnexpectedShutdown' method available for '${driver.constructor.name}'?`);
    }
  }

  async curSessionDataForDriver (InnerDriver) {
    const sessions = await sessionsListGuard.acquire(AppiumDriver.name, () => this.sessions);
    const data = _.values(sessions)
                   .filter((s) => s.constructor.name === InnerDriver.name)
                   .map((s) => s.driverData);
    for (let datum of data) {
      if (!datum) {
        throw new Error(`Problem getting session data for driver type ` +
                        `${InnerDriver.name}; does it implement 'get ` +
                        `driverData'?`);
      }
    }
    return data;
  }

  async deleteSession (sessionId) {
    let protocol;
    try {
      let otherSessionsData = null;
      let dstSession = null;
      await sessionsListGuard.acquire(AppiumDriver.name, () => {
        if (!this.sessions[sessionId]) {
          return;
        }
        const curConstructorName = this.sessions[sessionId].constructor.name;
        otherSessionsData = _.toPairs(this.sessions)
              .filter(([key, value]) => value.constructor.name === curConstructorName && key !== sessionId)
              .map(([, value]) => value.driverData);
        dstSession = this.sessions[sessionId];
        protocol = dstSession.protocol;
        this.log.info(`Removing session ${sessionId} from our master session list`);
        // regardless of whether the deleteSession completes successfully or not
        // make the session unavailable, because who knows what state it might
        // be in otherwise
        delete this.sessions[sessionId];
        delete this.sessionPlugins[sessionId];
      });
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

  async deleteAllSessions (opts = {}) {
    const sessionsCount = _.size(this.sessions);
    if (0 === sessionsCount) {
      this.log.debug('There are no active sessions for cleanup');
      return;
    }

    const {
      force = false,
      reason,
    } = opts;
    this.log.debug(`Cleaning up ${util.pluralize('active session', sessionsCount, true)}`);
    const cleanupPromises = force
      ? _.values(this.sessions).map((drv) => drv.startUnexpectedShutdown(reason && new Error(reason)))
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
   * @returns {Array} - array of plugin instances
   */
  pluginsForSession (sessionId = null) {
    if (sessionId) {
      if (!this.sessionPlugins[sessionId]) {
        this.sessionPlugins[sessionId] = this.createPluginInstances();
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
  pluginsToHandleCmd (cmd, sessionId = null) {
    // to handle a given command, a plugin should either implement that command as a plugin
    // instance method or it should implement a generic 'handle' method
    return this.pluginsForSession(sessionId)
      .filter((p) => _.isFunction(p[cmd]) || _.isFunction(p.handle));
  }

  createPluginInstances () {
    return this.pluginClasses.map((PluginClass) => {
      const name = PluginClass.pluginName;
      const plugin = new PluginClass(name);
      this.assignCliArgsToExtension('plugin', name, plugin);
      return plugin;
    });
  }

  async executeCommand (cmd, ...args) {
    // We have basically three cases for how to handle commands:
    // 1. handle getStatus (we do this as a special out of band case so it doesn't get added to an
    //    execution queue, and can be called while e.g. createSession is in progress)
    // 2. handle commands that this umbrella driver should handle, rather than the actual session
    //    driver (for example, deleteSession, or other non-session commands)
    // 3. handle session driver commands.
    // The tricky part is that because we support command plugins, we need to wrap any of these
    // cases with plugin handling.

    const isGetStatus = cmd === GET_STATUS_COMMAND;
    const isDeleteSession = cmd === DELETE_SESSION_COMMAND;
    const isUmbrellaCmd = !isGetStatus && isAppiumDriverCommand(cmd);
    const isSessionCmd = !isUmbrellaCmd || isDeleteSession;

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
    let driver = this;
    if (isSessionCmd) {
      sessionId = _.last(args);
      dstSession = await sessionsListGuard.acquire(AppiumDriver.name, () => this.sessions[sessionId]);
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
      plugins.length && this.log.info(`Executing default handling behavior for command '${cmd}'`);

      // if we make it here, we know that the default behavior is handled
      cmdHandledBy.default = true;

      if (reqForProxy) {
        // we would have proxied this command had a plugin not handled it, so the default behavior
        // is to do the proxy and retrieve the result internally so it can be passed to the plugin
        // in case it calls 'await next()'. This requires that the driver have defined
        // 'proxyCommand' and not just 'proxyReqRes'.
        if (!dstSession.proxyCommand) {
          throw new NoDriverProxyCommandError();
        }
        return await dstSession.proxyCommand(reqForProxy.originalUrl, reqForProxy.method,
          reqForProxy.body);
      }

      if (isGetStatus) {
        return await this.getStatus();
      }

      if (isUmbrellaCmd) {
        // some commands, like deleteSession, we want to make sure to handle on *this* driver,
        // not the platform driver
        return await super.executeCommand(cmd, ...args);
      }

      // here we know that we are executing a session command, and have a valid session driver
      return await dstSession.executeCommand(cmd, ...args);
    };

    // now take our default behavior, wrap it with any number of plugin behaviors, and run it
    const wrappedCmd = this.wrapCommandWithPlugins({
      driver, cmd, args, plugins, cmdHandledBy, next: defaultBehavior
    });
    const res = await this.executeWrappedCommand({wrappedCmd, protocol});

    // if we had plugins, make sure to log out the helpful report about which plugins ended up
    // handling the command and which didn't
    this.logPluginHandlerReport(plugins, {cmd, cmdHandledBy});

    // And finally, if the command was createSession, we want to migrate any plugins which were
    // previously sessionless to use the new sessionId, so that plugins can share state between
    // their createSession method and other instance methods
    if (cmd === CREATE_SESSION_COMMAND && this.sessionlessPlugins.length && !res.error) {
      const sessionId = _.first(res.value);
      this.log.info(`Promoting ${this.sessionlessPlugins.length} sessionless plugins to be attached ` +
        `to session ID ${sessionId}`);
      this.sessionPlugins[sessionId] = this.sessionlessPlugins;
      this.sessionlessPlugins = [];
    }

    return res;
  }

  wrapCommandWithPlugins ({driver, cmd, args, next, cmdHandledBy, plugins}) {
    plugins.length && this.log.info(`Plugins which can handle cmd '${cmd}': ${plugins.map((p) => p.name)}`);

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

  logPluginHandlerReport (plugins, {cmd, cmdHandledBy}) {
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
      this.log.info(`Command '${cmd}' was *not* handled by the following behaviours or plugins, even ` +
        `though they were registered to handle it: ${JSON.stringify(didntHandle)}. The ` +
        `command *was* handled by these: ${JSON.stringify(didHandle)}.`);
    }
  }

  async executeWrappedCommand ({wrappedCmd, protocol}) {
    let cmdRes, cmdErr, res = {};
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

  proxyActive (sessionId) {
    const dstSession = this.sessions[sessionId];
    return dstSession && _.isFunction(dstSession.proxyActive) && dstSession.proxyActive(sessionId);
  }

  getProxyAvoidList (sessionId) {
    const dstSession = this.sessions[sessionId];
    return dstSession ? dstSession.getProxyAvoidList() : [];
  }

  canProxy (sessionId) {
    const dstSession = this.sessions[sessionId];
    return dstSession && dstSession.canProxy(sessionId);
  }
}

// help decide which commands should be proxied to sub-drivers and which
// should be handled by this, our umbrella driver
function isAppiumDriverCommand (cmd) {
  return !isSessionCommand(cmd) || cmd === 'deleteSession';
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

  constructor () {
    super(`The default behavior for this command was to proxy, but the driver ` +
          `did not have the 'proxyCommand' method defined. To fully support ` +
          `plugins, drivers should have 'proxyCommand' set to a jwpProxy object's ` +
          `'command()' method, in addition to the normal 'proxyReqRes'`);
  }
}

export { AppiumDriver };
