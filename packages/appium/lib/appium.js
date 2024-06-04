/* eslint-disable no-unused-vars */
import _ from 'lodash';
import B from 'bluebird';
import {getBuildInfo, updateBuildInfo, APPIUM_VER} from './config';
import {
  BaseDriver,
  DriverCore,
  errors,
  isSessionCommand,
  CREATE_SESSION_COMMAND,
  DELETE_SESSION_COMMAND,
  GET_STATUS_COMMAND,
  MAX_LOG_BODY_LENGTH,
  promoteAppiumOptions,
  promoteAppiumOptionsForObject,
} from '@appium/base-driver';
import AsyncLock from 'async-lock';
import {parseCapsForInnerDriver, pullSettings, makeNonW3cCapsError} from './utils';
import {util, node, logger} from '@appium/support';
import {getDefaultsForExtension} from './schema';
import {DRIVER_TYPE, BIDI_BASE_PATH, BIDI_EVENT_NAME} from './constants';
import WebSocket from 'ws';

const MIN_WS_CODE_VAL = 1000;
const MAX_WS_CODE_VAL = 1015;
const WS_FALLBACK_CODE = 1011; // server encountered an error while fulfilling request

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
   * Retrieves logger instance for the current umbrella driver instance
   */
  get log() {
    if (!this._log) {
      const instanceName = `${this.constructor.name}@${node.getObjectId(this).substring(0, 4)}`;
      this._log = logger.getLogger(instanceName);
    }
    return this._log;
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

  // eslint-disable-next-line require-await
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

  async getSessions() {
    return _.toPairs(this.sessions).map(([id, driver]) => ({
      id,
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
   * Initialize a new bidi connection and set up handlers
   * @param {import('ws').WebSocket} ws The websocket connection object
   * @param {import('http').IncomingMessage} req The connection pathname, which might include the session id
   */
  onBidiConnection(ws, req) {
    // TODO put bidi-related functionality into a mixin/helper class
    // wrap all of the handler logic with exception handling so if something blows up we can log
    // and close the websocket
    try {
      const {bidiHandlerDriver, proxyClient, send, sendToProxy, logSocketErr} = this.initBidiSocket(
        ws,
        req,
      );

      this.initBidiSocketHandlers(
        ws,
        proxyClient,
        send,
        sendToProxy,
        bidiHandlerDriver,
        logSocketErr,
      );
      this.initBidiProxyHandlers(proxyClient, ws, send);
      this.initBidiEventListeners(ws, bidiHandlerDriver, send);
    } catch (err) {
      this.log.error(err);
      try {
        ws.close();
      } catch (ign) {}
    }
  }

  /**
   * Initialize a new bidi connection
   * @param {import('ws').WebSocket} ws The websocket connection object
   * @param {import('http').IncomingMessage} req The connection pathname, which might include the session id
   */
  initBidiSocket(ws, req) {
    let outOfBandErrorPrefix = '';
    const pathname = req.url;
    if (!pathname) {
      throw new Error('Invalid connection request: pathname missing from request');
    }
    const bidiSessionRe = new RegExp(`${BIDI_BASE_PATH}/([^/]+)$`);
    const bidiNoSessionRe = new RegExp(`${BIDI_BASE_PATH}/?$`);
    const sessionMatch = bidiSessionRe.exec(pathname);
    const noSessionMatch = bidiNoSessionRe.exec(pathname);

    if (!sessionMatch && !noSessionMatch) {
      throw new Error(
        `Got websocket connection for path ${pathname} but didn't know what to do with it. ` +
          `Ignoring and will close the connection`,
      );
    }

    // Let's figure out which driver is going to handle this socket connection. It's either going
    // to be a driver matching a session id appended to the bidi base path, or this umbrella driver
    // (if no session id is included in the bidi connection request)

    /** @type {import('@appium/types').ExternalDriver | AppiumDriver} */
    let bidiHandlerDriver;

    /** @type {import('ws').WebSocket | null} */
    let proxyClient = null;

    if (sessionMatch) {
      // If we found a session id, see if it matches an active session
      const sessionId = sessionMatch[1];
      bidiHandlerDriver = this.sessions[sessionId];
      if (!bidiHandlerDriver) {
        // The session ID sent in doesn't match an active session; just ignore this socket
        // connection in that case
        throw new Error(
          `Got bidi connection request for session with id ${sessionId} which is closed ` +
            `or does not exist. Closing the socket connection.`,
        );
      }
      const driverName = bidiHandlerDriver.constructor.name;
      outOfBandErrorPrefix = `[session ${sessionId}] `;
      this.log.info(`Bidi websocket connection made for session ${sessionId}`);
      // store this socket connection for later removal on session deletion. theoretically there
      // can be multiple sockets per session
      if (!this.bidiSockets[sessionId]) {
        this.bidiSockets[sessionId] = [];
      }
      this.bidiSockets[sessionId].push(ws);

      const bidiProxyUrl = bidiHandlerDriver.bidiProxyUrl;
      if (bidiProxyUrl) {
        try {
          new URL(bidiProxyUrl);
        } catch (ign) {
          throw new Error(
            `Got request for ${driverName} to proxy bidi connections to upstream socket with ` +
              `url ${bidiProxyUrl}, but this was not a valid url`,
          );
        }
        this.log.info(`Bidi connection for ${driverName} will be proxied to ${bidiProxyUrl}`);
        proxyClient = new WebSocket(bidiProxyUrl);
        this.bidiProxyClients[sessionId] = proxyClient;
      }
    } else {
      this.log.info('Bidi websocket connection made to main server');
      // no need to store the socket connection if it's to the main server since it will just
      // stay open as long as the server itself is and will close when the server closes.
      bidiHandlerDriver = this; // eslint-disable-line @typescript-eslint/no-this-alias
    }

    const logSocketErr = (/** @type {Error} */ err) =>
      this.log.error(`${outOfBandErrorPrefix}${err}`);

    // This is a function which wraps the 'send' method on a web socket for two reasons:
    // 1. Make it async-await friendly
    // 2. Do some logging if there's a send error
    const sendFactory = (/** @type {import('ws').WebSocket} */ socket) => {
      const socketSend = B.promisify(socket.send, {context: socket});
      return async (/** @type {string|Buffer} */ data) => {
        try {
          await socketSend(data);
        } catch (err) {
          logSocketErr(err);
        }
      };
    };

    // Construct our send method for sending messages to the client
    const send = sendFactory(ws);

    // Construct a conditional send method for proxying messages from the client to an upstream
    // bidi socket server (e.g. on a browser)
    const sendToProxy = proxyClient ? sendFactory(proxyClient) : null;

    return {bidiHandlerDriver, proxyClient, send, sendToProxy, logSocketErr};
  }

  /**
   * Set up handlers on upstream bidi socket we are proxying to/from
   *
   * @param {import('ws').WebSocket | null} proxyClient - the websocket connection to/from the
   * upstream socket (the one we're proxying to/from)
   * @param {import('ws').WebSocket} ws - the websocket connection to/from the client
   * @param {(data: string | Buffer) => Promise<void>} send - a method used to send data to the
   * client
   */
  initBidiProxyHandlers(proxyClient, ws, send) {
    // Set up handlers for events that might come from the upstream bidi socket connection if
    // we're in proxy mode
    if (proxyClient) {
      // Here we're receiving a message from the upstream socket server. We want to pass it on to
      // the client
      proxyClient.on('message', async (/** @type {Buffer|string} */ data) => {
        const logData = _.truncate(data.toString('utf8'), {length: MAX_LOG_BODY_LENGTH});
        this.log.debug(
          `<-- BIDI Received data from proxied bidi socket, sending to client. Data: ${logData}`,
        );
        await send(data);
      });

      // If the upstream socket server closes the connection, should close the connection to the
      // client as well
      proxyClient.on('close', (code, reason) => {
        this.log.debug(
          `Upstream bidi socket closed connection (code ${code}, reason: '${reason}'). ` +
            `Closing proxy connection to client`,
        );
        if (!_.isNumber(code)) {
          code = parseInt(code, 10);
        }
        if (_.isNaN(code) || code < MIN_WS_CODE_VAL || code > MAX_WS_CODE_VAL) {
          this.log.warn(
            `Received code ${code} from upstream socket, but this is not a valid ` +
              `websocket code. Rewriting to ${WS_FALLBACK_CODE} for ws compatibility`,
          );
          code = WS_FALLBACK_CODE;
        }
        ws.close(code, reason);
      });

      proxyClient.on('error', (err) => {
        this.log.error(`Got error on upstream bidi socket connection: ${err}`);
      });
    }
  }

  /**
   * Set up handlers on the bidi socket connection to the client
   *
   * @param {import('ws').WebSocket} ws - the websocket connection to/from the client
   * @param {import('ws').WebSocket | null} proxyClient - the websocket connection to/from the
   * upstream socket (the one we're proxying to/from, if we're proxying)
   * @param {(data: string | Buffer) => Promise<void>} send - a method used to send data to the
   * client
   * @param {((data: string | Buffer) => Promise<void>) | null} sendToProxy - a method used to send data to the
   * upstream socket
   * @param {import('@appium/types').ExternalDriver | AppiumDriver} bidiHandlerDriver - the driver
   * handling the bidi commands
   * @param {(err: Error) => void} logSocketErr - a special prefixed logger
   */
  initBidiSocketHandlers(ws, proxyClient, send, sendToProxy, bidiHandlerDriver, logSocketErr) {
    ws.on('error', (err) => {
      // Can't do much with random errors on the connection other than log them
      logSocketErr(err);
    });

    ws.on('open', () => {
      this.log.info('Bidi websocket connection is now open');
    });

    // Now set up handlers for the various events that might happen on the websocket connection
    // coming from the client
    // First is incoming messages from the client
    ws.on('message', async (/** @type {Buffer} */ data) => {
      if (proxyClient) {
        const logData = _.truncate(data.toString('utf8'), {length: MAX_LOG_BODY_LENGTH});
        this.log.debug(
          `--> BIDI Received data from client, sending to upstream bidi socket. Data: ${logData}`,
        );
        // if we're meant to proxy to an upstream bidi socket, just do that
        // @ts-ignore sendToProxy is never null if proxyClient is truthy, but ts doesn't know
        // that
        await sendToProxy(data.toString('utf8'));
      } else {
        const res = await this.onBidiMessage(data, bidiHandlerDriver);
        await send(JSON.stringify(res));
      }
    });

    // Next consider if the client closes the socket connection on us
    ws.on('close', (code, reason) => {
      // Not sure if we need to do anything here if the client closes the websocket connection.
      // Probably if a session was started via the socket, and the socket closes, we should end the
      // associated session to free up resources. But otherwise, for sockets attached to existing
      // sessions, doing nothing is probably right.
      this.log.debug(`Bidi socket connection closed (code ${code}, reason: '${reason}')`);

      // If we're proxying, might as well close the upstream connection and clean it up
      if (proxyClient) {
        this.log.debug('Also closing bidi proxy socket connection');
        proxyClient.close(code, reason);
      }
    });
  }

  /**
   * Set up bidi event listeners
   *
   * @param {import('ws').WebSocket} ws - the websocket connection to/from the client
   * @param {import('@appium/types').ExternalDriver | AppiumDriver} bidiHandlerDriver - the driver
   * handling the bidi commands
   * @param {(data: string | Buffer) => Promise<void>} send - a method used to send data to the
   * client
   */
  initBidiEventListeners(ws, bidiHandlerDriver, send) {
    // If the driver emits a bidi event that should maybe get sent to the client, check to make
    // sure the client is subscribed and then pass it on
    let eventListener = async ({context, method, params}) => {
      // if the driver didn't specify a context, use the empty context
      if (!context) {
        context = '';
      }
      if (!method || !params) {
        throw new Error(
          `Driver emitted a bidi event that was malformed. Require method and params keys ` +
            `(with optional context). But instead received: ${JSON.stringify({
              context,
              method,
              params,
            })}`,
        );
      }
      if (ws.readyState !== WebSocket.OPEN) {
        // if the websocket is not still 'open', then we can ignore sending these events
        if (ws.readyState > WebSocket.OPEN) {
          // if the websocket is closed or closing, we can remove this listener as well to avoid
          // leaks
          bidiHandlerDriver.eventEmitter.removeListener(BIDI_EVENT_NAME, eventListener);
        }
        return;
      }

      if (bidiHandlerDriver.bidiEventSubs[method]?.includes(context)) {
        this.log.info(
          `<-- BIDI EVENT ${method} (context: '${context}', params: ${JSON.stringify(params)})`,
        );
        // now we can send the event onto the socket
        const ev = {type: 'event', context, method, params};
        await send(JSON.stringify(ev));
      }
    };
    bidiHandlerDriver.eventEmitter.on(BIDI_EVENT_NAME, eventListener);
  }

  /**
   * @param {Buffer} data
   * @param {ExternalDriver | AppiumDriver} driver
   */
  async onBidiMessage(data, driver) {
    let resMessage, id, method, params;
    const dataTruncated = _.truncate(data.toString(), {length: 100});
    try {
      try {
        ({id, method, params} = JSON.parse(data.toString('utf8')));
      } catch (err) {
        throw new errors.InvalidArgumentError(
          `Could not parse Bidi command '${dataTruncated}': ${err.message}`,
        );
      }
      driver.log.info(`--> BIDI message #${id}`);
      if (!method) {
        throw new errors.InvalidArgumentError(
          `Missing method for BiDi operation in '${dataTruncated}'`,
        );
      }
      if (!params) {
        throw new errors.InvalidArgumentError(
          `Missing params for BiDi operation in '${dataTruncated}`,
        );
      }
      const result = await driver.executeBidiCommand(method, params);
      // https://w3c.github.io/webdriver-bidi/#protocol-definition
      resMessage = {
        id,
        type: 'success',
        result,
      };
    } catch (err) {
      resMessage = err.bidiErrObject(id);
    }
    driver.log.info(`<-- BIDI message #${id}`);
    return resMessage;
  }

  /**
   * Log a bidi server error
   * @param {Error} err
   */
  onBidiServerError(err) {
    this.log.error(`Error from bidi websocket server: ${err}`);
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

      // We want to assign security values directly on the driver. The driver
      // should not read security values from `this.opts` because those values
      // could have been set by a malicious user via capabilities, whereas we
      // want a guarantee the values were set by the appium server admin
      if (this.args.relaxedSecurityEnabled) {
        this.log.info(
          `Applying relaxed security to '${InnerDriver.name}' as per ` +
            `server command line argument. All insecure features will be ` +
            `enabled unless explicitly disabled by --deny-insecure`,
        );
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
      driverInstance.startNewCommandTimeout();

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

      // if the user has asked for bidi support, and the driver says that it supports bidi,
      // send our bidi url back to the user. The inner driver will need to have already saved any
      // internal bidi urls it might want to proxy to, cause we are going to overwrite that
      // information here!
      if (dCaps.webSocketUrl && driverInstance.doesSupportBidi) {
        const {address, port, basePath} = this.args;
        const isUsingSsl = this.args.sslCertificatePath && this.args.sslKeyPath;
        const scheme = isUsingSsl ? 'wss' : 'ws';
        const bidiUrl = `${scheme}://${address}:${port}${basePath}${BIDI_BASE_PATH}/${innerSessionId}`;
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

  /**
   * @param {string} sessionId
   */
  cleanupBidiSockets(sessionId) {
    // clean up any bidi sockets associated with session
    if (this.bidiSockets[sessionId]) {
      try {
        this.log.debug(`Closing bidi socket(s) associated with session ${sessionId}`);
        for (const ws of this.bidiSockets[sessionId]) {
          // 1001 means server is going away
          ws.close(1001, 'Appium session is closing');
        }
      } catch {}
      delete this.bidiSockets[sessionId];
      const proxyClient = this.bidiProxyClients[sessionId];
      if (proxyClient) {
        this.log.debug(`Also closing proxy connection to upstream bidi server`);
        try {
          // 1000 means normal closure, which seems correct when Appium is acting as the client
          proxyClient.close(1000);
        } catch {}
        delete this.bidiProxyClients[sessionId];
      }
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
   * @returns {Array} - array of plugin instances
   */
  pluginsForSession(sessionId = null) {
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
  pluginsToHandleCmd(cmd, sessionId = null) {
    // to handle a given command, a plugin should either implement that command as a plugin
    // instance method or it should implement a generic 'handle' method
    return this.pluginsForSession(sessionId).filter(
      (p) => _.isFunction(p[cmd]) || _.isFunction(p.handle),
    );
  }

  /**
   * Creates instances of all of the enabled Plugin classes
   * @returns {Plugin[]}
   */
  createPluginInstances() {
    /** @type {Plugin[]} */
    const pluginInstances = [];
    for (const [PluginClass, name] of this.pluginClasses.entries()) {
      const cliArgs = this.getCliArgsForPlugin(name);
      const plugin = new PluginClass(name, cliArgs);
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
      plugins.length && this.log.info(`Executing default handling behavior for command '${cmd}'`);

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
      this.sessionlessPlugins = [];
    }

    return res;
  }

  wrapCommandWithPlugins({driver, cmd, args, next, cmdHandledBy, plugins}) {
    plugins.length &&
      this.log.info(`Plugins which can handle cmd '${cmd}': ${plugins.map((p) => p.name)}`);

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
}

// help decide which commands should be proxied to sub-drivers and which
// should be handled by this, our umbrella driver
function isAppiumDriverCommand(cmd) {
  return !isSessionCommand(cmd) || cmd === DELETE_SESSION_COMMAND;
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
