import _ from 'lodash';
import log from './logger';
import { getAppiumConfig } from './config';
import { BaseDriver, errors, isSessionCommand } from 'appium-base-driver';
import { FakeDriver } from 'appium-fake-driver';
import { AndroidDriver } from 'appium-android-driver';
import { IosDriver } from 'appium-ios-driver';
import { AndroidUiautomator2Driver } from 'appium-uiautomator2-driver';
import { SelendroidDriver } from 'appium-selendroid-driver';
import { XCUITestDriver } from 'appium-xcuitest-driver';
import { YouiEngineDriver } from 'appium-youiengine-driver';
import { WindowsDriver } from 'appium-windows-driver';
import { MacDriver } from 'appium-mac-driver';
import { EspressoDriver } from 'appium-espresso-driver';
import B from 'bluebird';
import AsyncLock from 'async-lock';
import { inspectObject, parseCapsForInnerDriver } from './utils';
import semver from 'semver';

const sessionsListGuard = new AsyncLock();
const pendingDriversGuard = new AsyncLock();

class AppiumDriver extends BaseDriver {
  constructor (args) {
    super();

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

  getDriverForCaps (caps) {
    // TODO if this logic ever becomes complex, should probably factor out
    // into its own file
    if (!caps.platformName || !_.isString(caps.platformName)) {
      throw new Error("You must include a platformName capability");
    }

    // we don't necessarily have an `automationName` capability,
    if (caps.automationName) {
      if (caps.automationName.toLowerCase() === this.validAutomations.SELENDROID.toLowerCase()) {
        // but if we do and it is 'Selendroid', act on it
        return SelendroidDriver;
      } else if (caps.automationName.toLowerCase() === this.validAutomations.UIAUTOMATOR2.toLowerCase()) {
        // but if we do and it is 'Uiautomator2', act on it
        return AndroidUiautomator2Driver;
      } else if (caps.automationName.toLowerCase() === this.validAutomations.XCUITEST.toLowerCase()) {
        // but if we do and it is 'XCUITest', act on it
        return XCUITestDriver;
      } else if (caps.automationName.toLowerCase() === this.validAutomations.YOUIENGINE.toLowerCase()) {
        // but if we do and it is 'YouiEngine', act on it
        return YouiEngineDriver;
      } else if (caps.automationName.toLowerCase() === this.validAutomations.ESPRESSO.toLowerCase()) {
        log.warn('The Appium Espresso driver is currently in early beta and meant only for experimental usage. Its API is not yet complete or guaranteed to work. Please report bugs to the Appium team on GitHub.');
        return EspressoDriver;
      }
    }

    if (caps.platformName.toLowerCase() === "fake") {
      return FakeDriver;
    }

    if (caps.platformName.toLowerCase() === 'android') {
      const platformVersion = semver.valid(semver.coerce(caps.platformVersion));
      if (platformVersion && semver.satisfies(platformVersion, '>=6.0.0')) {
        log.warn("Consider setting 'automationName' capability to " +
                 `'${this.validAutomations.UIAUTOMATOR2.toLowerCase()}' ` +
                 "on Android >= 6, since UIAutomator framework " +
                 "is not maintained anymore by the OS vendor.");
      }

      return AndroidDriver;
    }

    if (caps.platformName.toLowerCase() === 'ios') {
      const platformVersion = semver.valid(semver.coerce(caps.platformVersion));
      if (platformVersion && semver.satisfies(platformVersion, '>=10.0.0')) {
        log.info("Requested iOS support with version >= 10, " +
                 `using '${this.validAutomations.XCUITEST.toLowerCase()}' ` +
                 "driver instead of UIAutomation-based driver, since the " +
                 "latter is unsupported on iOS 10 and up.");
        return XCUITestDriver;
      }

      return IosDriver;
    }

    if (caps.platformName.toLowerCase() === 'windows') {
      return WindowsDriver;
    }

    if (caps.platformName.toLowerCase() === 'mac') {
      return MacDriver;
    }

    let msg;
    if (caps.automationName) {
      msg = `Could not find a driver for automationName '${caps.automationName}' and platformName ` +
            `'${caps.platformName}'.`;
    } else {
      msg = `Could not find a driver for platformName '${caps.platformName}'.`;
    }
    throw new Error(`${msg} Please check your desired capabilities.`);
  }

  getDriverVersion (driver) {
    const NAME_DRIVER_MAP = {
      SelendroidDriver: 'appium-selendroid-driver',
      AndroidUiautomator2Driver: 'appium-uiautomator2-driver',
      XCUITestDriver: 'appium-xcuitest-driver',
      YouiEngineDriver: 'appium-youiengine-driver',
      FakeDriver: 'appium-fake-driver',
      AndroidDriver: 'appium-android-driver',
      IosDriver: 'appium-ios-driver',
      WindowsDriver: 'appium-windows-driver',
      MacDriver: 'appium-mac-driver',
    };
    if (!NAME_DRIVER_MAP[driver.name]) {
      log.warn(`Unable to get version of driver '${driver.name}'`);
      return;
    }
    let {version} = require(`${NAME_DRIVER_MAP[driver.name]}/package.json`);
    return version;
  }

  async getStatus () {
    let config = await getAppiumConfig();
    let gitSha = config['git-sha'];
    let status = {build: {version: config.version}};
    if (typeof gitSha !== "undefined") {
      status.build.revision = gitSha;
    }
    return status;
  }

  async getSessions () {
    const sessions = await sessionsListGuard.acquire(AppiumDriver.name, () => this.sessions);
    return _.toPairs(sessions)
        .map(([id, driver]) => {
          return {id, capabilities: driver.caps};
        });
  }

  printNewSessionAnnouncement (driver, caps) {
    let driverVersion = this.getDriverVersion(driver);
    let introString = driverVersion ?
      `Creating new ${driver.name} (v${driverVersion}) session` :
      `Creating new ${driver.name} session`;
    log.info(introString);
    log.info('Capabilities:');
    inspectObject(caps);
  }

  /**
   * Create a new session
   * @param {Object} jsonwpCaps JSONWP formatted desired capabilities
   * @param {Object} reqCaps Required capabilities (JSONWP standard)
   * @param {Object} w3cCapabilities W3C capabilities
   * @return {Array} Unique session ID and capabilities
   */
  async createSession (jsonwpCaps, reqCaps, w3cCapabilities) {
    let {defaultCapabilities} = this.args;
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

      let {desiredCaps, processedJsonwpCapabilities, processedW3CCapabilities, error} = parsedCaps;
      protocol = parsedCaps.protocol;

      // If the parsing of the caps produced an error, throw it in here
      if (error) {
        throw error;
      }

      let InnerDriver = this.getDriverForCaps(desiredCaps);
      this.printNewSessionAnnouncement(InnerDriver, desiredCaps);

      if (this.args.sessionOverride) {
        const sessionIdsToDelete = await sessionsListGuard.acquire(AppiumDriver.name, () => _.keys(this.sessions));
        if (sessionIdsToDelete.length) {
          log.info(`Session override is on. Deleting other ${sessionIdsToDelete.length} active session${sessionIdsToDelete.length ? '' : 's'}.`);
          try {
            await B.map(sessionIdsToDelete, (id) => this.deleteSession(id));
          } catch (ign) {}
        }
      }

      let runningDriversData, otherPendingDriversData;
      let d = new InnerDriver(this.args);
      if (this.args.relaxedSecurityEnabled) {
        log.info(`Applying relaxed security to ${InnerDriver.name} as per server command line argument`);
        d.relaxedSecurityEnabled = true;
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

      // this is an async function but we don't await it because it handles
      // an out-of-band promise which is fulfilled if the inner driver
      // unexpectedly shuts down
      this.attachUnexpectedShutdownHandler(d, innerSessionId);


      log.info(`New ${InnerDriver.name} session created successfully, session ` +
              `${innerSessionId} added to master session list`);

      // set the New Command Timeout for the inner driver
      d.startNewCommandTimeout();
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

  async attachUnexpectedShutdownHandler (driver, innerSessionId) {
    // Remove the session on unexpected shutdown, so that we are in a position
    // to open another session later on.
    // TODO: this should be removed and replaced by a onShutdown callback.
    try {
      await driver.onUnexpectedShutdown; // this is a cancellable promise
      // if we get here, we've had an unexpected shutdown, so error
      throw new Error('Unexpected shutdown');
    } catch (e) {
      if (e instanceof B.CancellationError) {
        // if we cancelled the unexpected shutdown promise, that means we
        // no longer care about it, and can safely ignore it
        return;
      }
      log.warn(`Closing session, cause was '${e.message}'`);
      log.info(`Removing session ${innerSessionId} from our master session list`);
      await sessionsListGuard.acquire(AppiumDriver.name, () => {
        delete this.sessions[innerSessionId];
      });
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
  return !isSessionCommand(cmd) || cmd === "deleteSession";
}

export { AppiumDriver };
