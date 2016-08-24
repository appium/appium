import _ from 'lodash';
import log from './logger';
import { getAppiumConfig } from './config';
import { BaseDriver, routeConfiguringFunction, errors,
         isSessionCommand } from 'appium-base-driver';
import { FakeDriver } from 'appium-fake-driver';
import { AndroidDriver } from 'appium-android-driver';
import { IosDriver } from 'appium-ios-driver';
import { SelendroidDriver } from 'appium-selendroid-driver';
import { XCUITestDriver } from 'appium-xcuitest-driver';
import { YouiEngineDriver } from 'appium-youiengine-driver';
import { WindowsDriver } from 'appium-windows-driver';
import B from 'bluebird';
import util from 'util';


class AppiumDriver extends BaseDriver {
  constructor (args) {
    super();

    // the main Appium Driver has no new command timeout
    this.newCommandTimeoutMs = 0;

    this.args = args;

    this.sessions = {};
  }

  sessionExists (sessionId) {
    return _.includes(_.keys(this.sessions), sessionId) &&
           this.sessions[sessionId].sessionId !== null;
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
      if (caps.automationName.toLowerCase() === 'selendroid') {
        // but if we do and it is 'Selendroid', act on it
        return SelendroidDriver;
      } else if (caps.automationName.toLowerCase() === 'xcuitest') {
        // but if we do and it is 'XCUITest', act on it
        return XCUITestDriver;
      } else if (caps.automationName.toLowerCase() === 'youiengine') {
        // but if we do and it is 'YouiEngine', act on it
        return YouiEngineDriver;
      }
    }

    if (caps.platformName.toLowerCase() === "fake") {
      return FakeDriver;
    }

    if (caps.platformName.toLowerCase() === 'android') {
      return AndroidDriver;
    }

    if (caps.platformName.toLowerCase() === 'ios') {
      if (caps.platformVersion) {
        let majorVer = caps.platformVersion.toString().split(".")[0];
        if (parseInt(majorVer, 10) >= 10) {
          log.info("Requested iOS support with version >= 10, using XCUITest " +
                   "driver instead of UIAutomation-based driver, since the " +
                   "latter is unsupported on iOS 10 and up.");
          return XCUITestDriver;
        }
      }

      return IosDriver;
    }

    if (caps.platformName.toLowerCase() === 'windows') {
      return WindowsDriver;
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
    let sessions = [];
    for (let [id, driver] of _.toPairs(this.sessions)) {
      sessions.push({id, capabilities: driver.caps});
    }
    return sessions;
  }

  async createSession (caps, reqCaps) {
    caps = _.defaults(_.clone(caps), this.args.defaultCapabilities);
    let InnerDriver = this.getDriverForCaps(caps);
    let curSessions;
    log.info(`Creating new ${InnerDriver.name} session`);
    log.info('Capabilities:');
    util.inspect(caps);
    for (let [cap, value] of _.toPairs(caps)) {
      log.info(`  ${cap}: ${util.inspect(value)}`);
    }

    // sessionOverride server flag check
    // this will need to be re-thought when we go to multiple session support
    if (this.args.sessionOverride && !!this.sessions && _.keys(this.sessions).length > 0) {
      log.info('Session override is on. Deleting other sessions.');
      for (let id of _.keys(this.sessions)) {
        log.info(`    Deleting session '${id}'`);
        try {
          await this.deleteSession(id);
        } catch (ign) {
          // the error has already been logged in AppiumDriver.deleteSession
          // continue
        }
      }
    }

    try {
      curSessions = this.curSessionDataForDriver(InnerDriver);
    } catch (e) {
      throw new errors.SessionNotCreatedError(e.message);
    }

    let d = new InnerDriver(this.args);
    let [innerSessionId, dCaps] = await d.createSession(caps, reqCaps, curSessions);
    this.sessions[innerSessionId] = d;

    // Remove the session on unexpected shutdown, so that we are in a position
    // to open another session later on.
    // TODO: this should be removed and replaced by a onShutdown callback.
    d.onUnexpectedShutdown
      .then(() => { throw new Error('Unexpected shutdown'); })
      .catch(B.CancellationError, () => {})
      .catch((err) => {
        log.warn(`Closing session, cause was '${err.message}'`);
        log.info(`Removing session ${innerSessionId} from our master session list`);
        delete this.sessions[innerSessionId];
      })
      .done();

    log.info(`New ${InnerDriver.name} session created successfully, session ` +
             `${innerSessionId} added to master session list`);

    // set the New Command Timeout for the inner driver
    d.startNewCommandTimeout();

    return [innerSessionId, dCaps];
  }

  curSessionDataForDriver (InnerDriver) {
    let data = _.values(this.sessions)
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
    try {
      if (this.sessions[sessionId]) {
        await this.sessions[sessionId].deleteSession();
      }
    } catch (e) {
      log.error(`Had trouble ending session ${sessionId}: ${e.message}`);
      throw e;
    } finally {
      // regardless of whether the deleteSession completes successfully or not
      // make the session unavailable, because who knows what state it might
      // be in otherwise
      log.info(`Removing session ${sessionId} from our master session list`);
      delete this.sessions[sessionId];
    }
  }

  async executeCommand (cmd, ...args) {
    if (isAppiumDriverCommand(cmd)) {
      return super.executeCommand(cmd, ...args);
    }

    let sessionId = args[args.length - 1];
    return this.sessions[sessionId].executeCommand(cmd, ...args);
  }

  proxyActive (sessionId) {
    return this.sessions[sessionId] &&
           _.isFunction(this.sessions[sessionId].proxyActive) &&
           this.sessions[sessionId].proxyActive(sessionId);
  }

  getProxyAvoidList (sessionId) {
    if (!this.sessions[sessionId]) {
      return [];
    }
    return this.sessions[sessionId].getProxyAvoidList();
  }

  canProxy (sessionId) {
    return this.sessions[sessionId] && this.sessions[sessionId].canProxy(sessionId);
  }
}

// help decide which commands should be proxied to sub-drivers and which
// should be handled by this, our umbrella driver
function isAppiumDriverCommand (cmd) {
  return !isSessionCommand(cmd) || cmd === "deleteSession";
}

function getAppiumRouter (args) {
  let appium = new AppiumDriver(args);
  return routeConfiguringFunction(appium);
}

export { AppiumDriver, getAppiumRouter };
export default getAppiumRouter;
