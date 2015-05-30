import _ from 'lodash';
import log from './logger';
import { BaseDriver } from 'appium-base-driver';
import { FakeDriver } from 'appium-fake-driver';
import { routeConfiguringFunction,
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
    throw new Error("Could not find a driver for those caps");
  }

  async getStatus () {
  }

  async getSessions () {
    let sessions = [];
    for (let [id, driver] of _.pairs(this.sessions)) {
      sessions.push(Object.assign({id}, driver.caps));
    }
    return sessions;
  }

  async createSession (caps) {
    let InnerDriver = this.getDriverForCaps(caps);
    let d = new InnerDriver(this.args);
    let [innerSessionId, dCaps] = await d.createSession(caps);
    this.sessions[innerSessionId] = d;
    return [innerSessionId, dCaps];
  }

  async deleteSession (sessionId) {
    try {
      await this.sessions[sessionId].deleteSession();
      console.log('deleted session');
    } catch (e) {
      console.log(e);
      log.error(`Had trouble ending session ${sessionId}: ${e.message}`);
      throw e;
    } finally {
      // regardless of whether the deleteSession completes successfully or not
      // make the session unavailable, because who knows what state it might
      // be in otherwise
      delete this.sessions[sessionId];
      console.log(this.sessions);
    }
  }

  async execute (cmd, ...args) {
    if (!isSessionCommand(cmd)) {
      return super.execute(cmd, ...args);
    }
    let sessionId = args[args.length - 1];
    return this.sessions[sessionId].execute(cmd, ...args);
  }
}

function getAppiumRouter (args) {
  let appium = new AppiumDriver(args);
  return routeConfiguringFunction(appium);
}

export { AppiumDriver, getAppiumRouter };
