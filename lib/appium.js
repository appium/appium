import _ from 'lodash';
import { BaseDriver } from 'appium-base-driver';
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

  async getStatus () {
  }

  async getSessions () {
    let sessions = [];
    for (let [id, driver] of _.pairs(this.sessions)) {
      sessions.push(Object.assign({id}, driver.caps));
    }
    return sessions;
  }

  async createSession (/*caps*/) {
    // TODO proxy createSession to the inner driver
    // let innerDriver = this.getDriverForCaps(caps);
    let innerSessionId, innerDriver;
    this.sessions[innerSessionId] = innerDriver;
  }

  async deleteSession (sessionId) {
    // TODO proxy the deleteSession to the inner driver
    delete this.sessions[sessionId];
  }

  async execute (cmd, ...args) {
    if (!isSessionCommand(cmd)) {
      return super.execute(cmd, ...args);
    }
    //let sessionId = args[args.length - 1];
  }
}

function getAppiumRouter (args) {
  let appium = new AppiumDriver(args);
  return routeConfiguringFunction(appium);
}

export { AppiumDriver, getAppiumRouter };
