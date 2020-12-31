import _ from 'lodash';
import log from './logger';
import { getBuildInfo, updateBuildInfo, APPIUM_VER } from './config';
import { BaseDriver, errors, isSessionCommand } from 'appium-base-driver';
import B from 'bluebird';
import AsyncLock from 'async-lock';
import { parseCapsForInnerDriver, getPackageVersion, pullSettings } from './utils';
import semver from 'semver';
import wrap from 'word-wrap';
import { EOL } from 'os';
import { util } from 'appium-support';


const PLATFORMS = {
  FAKE: 'fake',
  ANDROID: 'android',
  IOS: 'ios',
  APPLE_TVOS: 'tvos',
  WINDOWS: 'windows',
  MAC: 'mac',
  TIZEN: 'tizen',
};

const AUTOMATION_NAMES = {
  APPIUM: 'Appium',
  UIAUTOMATOR2: 'UiAutomator2',
  UIAUTOMATOR1: 'UiAutomator1',
  XCUITEST: 'XCUITest',
  YOUIENGINE: 'YouiEngine',
  ESPRESSO: 'Espresso',
  TIZEN: 'Tizen',
  FAKE: 'Fake',
  INSTRUMENTS: 'Instruments',
  WINDOWS: 'Windows',
  MAC: 'Mac',
  MAC2: 'Mac2',
  FLUTTER: 'Flutter',
  SAFARI: 'Safari',
  GECKO: 'Gecko',
};
const DRIVER_MAP = {
  [AUTOMATION_NAMES.UIAUTOMATOR2.toLowerCase()]: {
    driverClassName: 'AndroidUiautomator2Driver',
    driverPackage: 'appium-uiautomator2-driver',
  },
  [AUTOMATION_NAMES.XCUITEST.toLowerCase()]: {
    driverClassName: 'XCUITestDriver',
    driverPackage: 'appium-xcuitest-driver',
  },
  [AUTOMATION_NAMES.YOUIENGINE.toLowerCase()]: {
    driverClassName: 'YouiEngineDriver',
    driverPackage: 'appium-youiengine-driver',
  },
  [AUTOMATION_NAMES.FAKE.toLowerCase()]: {
    driverClassName: 'FakeDriver',
    driverPackage: 'appium-fake-driver',
  },
  [AUTOMATION_NAMES.UIAUTOMATOR1.toLowerCase()]: {
    driverClassName: 'AndroidDriver',
    driverPackage: 'appium-android-driver',
  },
  [AUTOMATION_NAMES.INSTRUMENTS.toLowerCase()]: {
    driverClassName: 'IosDriver',
    driverPackage: 'appium-ios-driver',
  },
  [AUTOMATION_NAMES.WINDOWS.toLowerCase()]: {
    driverClassName: 'WindowsDriver',
    driverPackage: 'appium-windows-driver',
  },
  [AUTOMATION_NAMES.MAC.toLowerCase()]: {
    driverClassName: 'MacDriver',
    driverPackage: 'appium-mac-driver',
  },
  [AUTOMATION_NAMES.MAC2.toLowerCase()]: {
    driverClassName: 'Mac2Driver',
    driverPackage: 'appium-mac2-driver',
  },
  [AUTOMATION_NAMES.ESPRESSO.toLowerCase()]: {
    driverClassName: 'EspressoDriver',
    driverPackage: 'appium-espresso-driver',
  },
  [AUTOMATION_NAMES.TIZEN.toLowerCase()]: {
    driverClassName: 'TizenDriver',
    driverPackage: 'appium-tizen-driver',
  },
  [AUTOMATION_NAMES.FLUTTER.toLowerCase()]: {
    driverClassName: 'FlutterDriver',
    driverPackage: 'appium-flutter-driver'
  },
  [AUTOMATION_NAMES.SAFARI.toLowerCase()]: {
    driverClassName: 'SafariDriver',
    driverPackage: 'appium-safari-driver'
  },
  [AUTOMATION_NAMES.GECKO.toLowerCase()]: {
    driverClassName: 'GeckoDriver',
    driverPackage: 'appium-geckodriver'
  },
};

const PLATFORMS_MAP = {
  [PLATFORMS.FAKE]: () => AUTOMATION_NAMES.FAKE,
  [PLATFORMS.ANDROID]: () => {
    // Warn users that default automation is going to change to UiAutomator2 for 1.14
    // and will become required on Appium 2.0
    const logDividerLength = 70; // Fit in command line

    const automationWarning = [
      `The 'automationName' capability was not provided in the desired capabilities for this Android session`,
      `Setting 'automationName=UiAutomator2' by default and using the UiAutomator2 Driver`,
      `The next major version of Appium (2.x) will **require** the 'automationName' capability to be set for all sessions on all platforms`,
      `In previous versions (Appium <= 1.13.x), the default was 'automationName=UiAutomator1'`,
      `If you wish to use that automation instead of UiAutomator2, please add 'automationName=UiAutomator1' to your desired capabilities`,
      `For more information about drivers, please visit http://appium.io/docs/en/about-appium/intro/ and explore the 'Drivers' menu`
    ];

    let divider = `${EOL}${_.repeat('=', logDividerLength)}${EOL}`;
    let automationWarningString = divider;
    automationWarningString += `  DEPRECATION WARNING:` + EOL;
    for (let log of automationWarning) {
      automationWarningString += EOL + wrap(log, {width: logDividerLength - 2}) + EOL;
    }
    automationWarningString += divider;

    // Recommend users to upgrade to UiAutomator2 if they're using Android >= 6
    log.warn(automationWarningString);

    return AUTOMATION_NAMES.UIAUTOMATOR2;
  },
  [PLATFORMS.IOS]: (caps) => {
    const platformVersion = semver.valid(semver.coerce(caps.platformVersion));
    log.warn(`DeprecationWarning: 'automationName' capability was not provided. ` +
      `Future versions of Appium will require 'automationName' capability to be set for iOS sessions.`);
    if (platformVersion && semver.satisfies(platformVersion, '>=10.0.0')) {
      log.info('Requested iOS support with version >= 10, ' +
        `using '${AUTOMATION_NAMES.XCUITEST}' ` +
        'driver instead of UIAutomation-based driver, since the ' +
        'latter is unsupported on iOS 10 and up.');
      return AUTOMATION_NAMES.XCUITEST;
    }

    return AUTOMATION_NAMES.INSTRUMENTS;
  },
  [PLATFORMS.APPLE_TVOS]: () => AUTOMATION_NAMES.XCUITEST,
  [PLATFORMS.WINDOWS]: () => AUTOMATION_NAMES.WINDOWS,
  [PLATFORMS.MAC]: () => AUTOMATION_NAMES.MAC,
  [PLATFORMS.TIZEN]: () => AUTOMATION_NAMES.TIZEN,
};

const desiredCapabilityConstraints = {
  automationName: {
    presence: false,
    isString: true,
    inclusionCaseInsensitive: _.values(AUTOMATION_NAMES),
  },
  platformName: {
    presence: true,
    isString: true,
    inclusionCaseInsensitive: _.keys(PLATFORMS_MAP),
  },
};

const sessionsListGuard = new AsyncLock();
const pendingDriversGuard = new AsyncLock();

class AppiumDriver extends BaseDriver {
  constructor (args) {
    // It is necessary to set `--tmp` here since it should be set to
    // process.env.APPIUM_TMP_DIR once at an initial point in the Appium lifecycle.
    // The process argument will be referenced by BaseDriver.
    // Please call appium-support.tempDir module to apply this benefit.
    if (args.tmpDir) {
      process.env.APPIUM_TMP_DIR = args.tmpDir;
    }

    super(args);

    this.desiredCapConstraints = desiredCapabilityConstraints;

    // the main Appium Driver has no new command timeout
    this.newCommandTimeoutMs = 0;

    this.args = Object.assign({}, args);

    // Access to sessions list must be guarded with a Semaphore, because
    // it might be changed by other async calls at any time
    // It is not recommended to access this property directly from the outside
    this.sessions = {};

    // Access to pending drivers list must be guarded with a Semaphore, because
    // it might be changed by other async calls at any time
    // It is not recommended to access this property directly from the outside
    this.pendingDrivers = {};

    // allow this to happen in the background, so no `await`
    updateBuildInfo();
  }

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

  getDriverAndVersionForCaps (caps) {
    if (!_.isString(caps.platformName)) {
      throw new Error('You must include a platformName capability');
    }

    const platformName = caps.platformName.toLowerCase();

    // we don't necessarily have an `automationName` capability
    let automationNameCap = caps.automationName;
    if (!_.isString(automationNameCap) || automationNameCap.toLowerCase() === 'appium') {
      const driverSelector = PLATFORMS_MAP[platformName];
      if (driverSelector) {
        automationNameCap = driverSelector(caps);
      }
    }
    automationNameCap = _.toLower(automationNameCap);

    let failureVerb = 'find';
    let suggestion = 'Please check your desired capabilities';
    if (_.isPlainObject(DRIVER_MAP[automationNameCap])) {
      try {
        const {driverPackage, driverClassName} = DRIVER_MAP[automationNameCap];
        const driver = require(driverPackage)[driverClassName];
        return {
          driver,
          version: this.getDriverVersion(driver.name, driverPackage),
        };
      } catch (e) {
        log.debug(e);
        failureVerb = 'load';
        suggestion = 'Please verify your Appium installation';
      }
    }

    const msg = _.isString(caps.automationName)
      ? `Could not ${failureVerb} a driver for automationName '${caps.automationName}' and platformName ` +
            `'${caps.platformName}'`
      : `Could not ${failureVerb} a driver for platformName '${caps.platformName}'`;
    throw new Error(`${msg}. ${suggestion}`);
  }

  getDriverVersion (driverName, driverPackage) {
    const version = getPackageVersion(driverPackage);
    if (version) {
      return version;
    }
    log.warn(`Unable to get version of driver '${driverName}'`);
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

  printNewSessionAnnouncement (driverName, driverVersion) {
    const introString = driverVersion
      ? `Appium v${APPIUM_VER} creating new ${driverName} (v${driverVersion}) session`
      : `Appium v${APPIUM_VER} creating new ${driverName} session`;
    log.info(introString);
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

      const {driver: InnerDriver, version: driverVersion} = this.getDriverAndVersionForCaps(desiredCaps);
      this.printNewSessionAnnouncement(InnerDriver.name, driverVersion);

      if (this.args.sessionOverride) {
        await this.deleteAllSessions();
      }

      let runningDriversData, otherPendingDriversData;
      const d = new InnerDriver(this.args);

      // We want to assign security values directly on the driver. The driver
      // should not read security values from `this.opts` because those values
      // could have been set by a malicious user via capabilities, whereas we
      // want a guarantee the values were set by the appium server admin
      if (this.args.relaxedSecurityEnabled) {
        log.info(`Applying relaxed security to '${InnerDriver.name}' as per ` +
                 `server command line argument. All insecure features will be ` +
                 `enabled unless explicitly disabled by --deny-insecure`);
        d.relaxedSecurityEnabled = true;
      }

      if (!_.isEmpty(this.args.denyInsecure)) {
        log.info('Explicitly preventing use of insecure features:');
        this.args.denyInsecure.map((a) => log.info(`    ${a}`));
        d.denyInsecure = this.args.denyInsecure;
      }

      if (!_.isEmpty(this.args.allowInsecure)) {
        log.info('Explicitly enabling use of insecure features:');
        this.args.allowInsecure.map((a) => log.info(`    ${a}`));
        d.allowInsecure = this.args.allowInsecure;
      }

      // This assignment is required for correct web sockets functionality inside the driver
      d.server = this.server;
      try {
        runningDriversData = await this.curSessionDataForDriver(InnerDriver);
      } catch (e) {
        throw new errors.SessionNotCreatedError(e.message);
      }
      await pendingDriversGuard.acquire(AppiumDriver.name, () => {
        this.pendingDrivers[InnerDriver.name] = this.pendingDrivers[InnerDriver.name] || [];
        otherPendingDriversData = this.pendingDrivers[InnerDriver.name].map((drv) => drv.driverData);
        this.pendingDrivers[InnerDriver.name].push(d);
      });

      try {
        [innerSessionId, dCaps] = await d.createSession(
          processedJsonwpCapabilities,
          reqCaps,
          processedW3CCapabilities,
          [...runningDriversData, ...otherPendingDriversData]
        );
        protocol = d.protocol;
        await sessionsListGuard.acquire(AppiumDriver.name, () => {
          this.sessions[innerSessionId] = d;
        });
      } finally {
        await pendingDriversGuard.acquire(AppiumDriver.name, () => {
          _.pull(this.pendingDrivers[InnerDriver.name], d);
        });
      }

      this.attachUnexpectedShutdownHandler(d, innerSessionId);

      log.info(`New ${InnerDriver.name} session created successfully, session ` +
              `${innerSessionId} added to master session list`);

      // set the New Command Timeout for the inner driver
      d.startNewCommandTimeout();

      // apply initial values to Appium settings (if provided)
      if (d.isW3CProtocol() && !_.isEmpty(w3cSettings)) {
        log.info(`Applying the initial values to Appium settings parsed from W3C caps: ` +
          JSON.stringify(w3cSettings));
        await d.updateSettings(w3cSettings);
      } else if (d.isMjsonwpProtocol() && !_.isEmpty(jwpSettings)) {
        log.info(`Applying the initial values to Appium settings parsed from MJSONWP caps: ` +
          JSON.stringify(jwpSettings));
        await d.updateSettings(jwpSettings);
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
    const removeSessionFromMasterList = (cause = new Error('Unknown error')) => {
      log.warn(`Closing session, cause was '${cause.message}'`);
      log.info(`Removing session '${innerSessionId}' from our master session list`);
      delete this.sessions[innerSessionId];
    };

    // eslint-disable-next-line promise/prefer-await-to-then
    if (_.isFunction((driver.onUnexpectedShutdown || {}).then)) {
      // TODO: Remove this block after all the drivers use base driver above v 5.0.0
      // Remove the session on unexpected shutdown, so that we are in a position
      // to open another session later on.
      driver.onUnexpectedShutdown
        // eslint-disable-next-line promise/prefer-await-to-then
        .then(() => {
          // if we get here, we've had an unexpected shutdown, so error
          throw new Error('Unexpected shutdown');
        })
        .catch((e) => {
          // if we cancelled the unexpected shutdown promise, that means we
          // no longer care about it, and can safely ignore it
          if (!(e instanceof B.CancellationError)) {
            removeSessionFromMasterList(e);
          }
        }); // this is a cancellable promise
    } else if (_.isFunction(driver.onUnexpectedShutdown)) {
      // since base driver v 5.0.0
      driver.onUnexpectedShutdown(removeSessionFromMasterList);
    } else {
      log.warn(`Failed to attach the unexpected shutdown listener. ` +
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
        log.info(`Removing session ${sessionId} from our master session list`);
        // regardless of whether the deleteSession completes successfully or not
        // make the session unavailable, because who knows what state it might
        // be in otherwise
        delete this.sessions[sessionId];
      });
      return {
        protocol,
        value: await dstSession.deleteSession(sessionId, otherSessionsData),
      };
    } catch (e) {
      log.error(`Had trouble ending session ${sessionId}: ${e.message}`);
      return {
        protocol,
        error: e,
      };
    }
  }

  async deleteAllSessions (opts = {}) {
    const sessionsCount = _.size(this.sessions);
    if (0 === sessionsCount) {
      log.debug('There are no active sessions for cleanup');
      return;
    }

    const {
      force = false,
      reason,
    } = opts;
    log.debug(`Cleaning up ${util.pluralize('active session', sessionsCount, true)}`);
    const cleanupPromises = force
      ? _.values(this.sessions).map((drv) => drv.startUnexpectedShutdown(reason && new Error(reason)))
      : _.keys(this.sessions).map((id) => this.deleteSession(id));
    for (const cleanupPromise of cleanupPromises) {
      try {
        await cleanupPromise;
      } catch (e) {
        log.debug(e);
      }
    }
  }

  async executeCommand (cmd, ...args) {
    // getStatus command should not be put into queue. If we do it as part of super.executeCommand, it will be added to queue.
    // There will be lot of status commands in queue during createSession command, as createSession can take up to or more than a minute.
    if (cmd === 'getStatus') {
      return await this.getStatus();
    }

    if (isAppiumDriverCommand(cmd)) {
      return await super.executeCommand(cmd, ...args);
    }

    const sessionId = _.last(args);
    const dstSession = await sessionsListGuard.acquire(AppiumDriver.name, () => this.sessions[sessionId]);
    if (!dstSession) {
      throw new Error(`The session with id '${sessionId}' does not exist`);
    }

    let res = {
      protocol: dstSession.protocol
    };

    try {
      res.value = await dstSession.executeCommand(cmd, ...args);
    } catch (e) {
      res.error = e;
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

export { AppiumDriver };
