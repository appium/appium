import _ from 'lodash';
import log from './logger';
import { BaseDriver } from 'appium-base-driver';
import { FakeDriver } from 'appium-fake-driver';
import { AndroidDriver } from 'appium-android-driver';
import { IosDriver } from 'appium-ios-driver';
import { routeConfiguringFunction, errors,
         isSessionCommand } from 'mobile-json-wire-protocol';

class AppiumDriver extends BaseDriver {

  constructor (args) {
    super();
    this.args = args;
    this.sessions = {};
  }

  sessionExists (sessionId) {
    return _.contains(_.keys(this.sessions), sessionId);
  }

  getDriverForCaps (caps) {
    // TODO if this logic ever becomes complex, should probably factor out
    // into its own file
    if (caps.platformName.toLowerCase() === "fake") {
      return FakeDriver;
    }

    if (caps.platformName.toLowerCase() === 'android') {
      return AndroidDriver;
    }

    if (caps.platformName.toLowerCase() === 'ios') {
      return IosDriver;
    }
    throw new Error("Could not find a driver for those caps");
  }

  async getStatus () {
  }

  async getSessions () {
    let sessions = [];
    for (let [id, driver] of _.pairs(this.sessions)) {
      sessions.push({id: id, capabilities: driver.caps});
    }
    return sessions;
  }

  async createSession (caps, reqCaps) {
    caps = _.defaults(_.clone(caps), this.args.defaultCapabilities);
    let InnerDriver = this.getDriverForCaps(caps);
    let curSessions;
    log.info(`Creating new ${InnerDriver.name} session`);
    try {
      curSessions = this.curSessionDataForDriver(InnerDriver);
    } catch (e) {
      throw new errors.SessionNotCreatedError(e.message);
    }
    let d = new InnerDriver(this.args);
    let [innerSessionId, dCaps] = await d.createSession(caps, reqCaps, curSessions);
    this.sessions[innerSessionId] = d;
    log.info(`New ${InnerDriver.name} session created successfully, session ` +
             `${innerSessionId} added to master session list`);
    return [innerSessionId, dCaps];
  }

   curSessionDataForDriver (InnerDriver) {
    let data = _.values(this.sessions)
                .filter(s => s.constructor.name === InnerDriver.name)
                .map(s => s.driverData);
    for (let d of data) {
      if (!d) {
        throw new Error(`Problem getting session data for driver type ` +
                        `${InnerDriver.name}; does it implement 'get ` +
                        `driverData'?`);
      }
    }
    return data;
   }

  async deleteSession (sessionId) {
    try {
      await this.sessions[sessionId].deleteSession();
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

    // since we don't call super.executeCommand, we need
    // to clear the appium driver timeout manually
    this.clearNewCommandTimeout();

    let sessionId = args[args.length - 1];
    return this.sessions[sessionId].executeCommand(cmd, ...args);
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
