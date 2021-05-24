import B from 'bluebird';
import _ from 'lodash';
import { BaseDriver, errors } from 'appium-base-driver';
import { FakeApp } from './fake-app';
import commands from './commands';

class FakeDriver extends BaseDriver {

  constructor () {
    super();
    this.appModel = null;
    this.curContext = 'NATIVE_APP';
    this.elMap = {};
    this.focusedElId = null;
    this.maxElId = 0;
    this.caps = {};
    this.fakeThing = null;

    this.desiredCapConstraints = {
      app: {
        presence: true,
        isString: true
      }
    };
  }

  async createSession (desiredCaps, requiredCaps, capabilities, otherSessionData = []) {

    // TODO add validation on caps.app that we will get for free from
    // BaseDriver

    // check to see if any other sessions have set uniqueApp. If so, emulate
    // not being able to start a session because of system resources
    for (let d of otherSessionData) {
      if (d.isUnique) {
        throw new errors.SessionNotCreatedError('Cannot start session; another ' +
            'unique session is in progress that requires all resources');
      }
    }

    let [sessionId, caps] = await super.createSession(desiredCaps, requiredCaps, capabilities, otherSessionData);
    this.appModel = new FakeApp();
    if (_.isArray(caps) === true && caps.length === 1) {
      caps = caps[0];
    }
    this.caps = caps;
    await this.appModel.loadApp(caps.app);
    return [sessionId, caps];
  }

  get driverData () {
    return {
      isUnique: !!this.caps.uniqueApp
    };
  }

  async getFakeThing () {
    await B.delay(1);
    return this.fakeThing;
  }

  async setFakeThing (thing) {
    await B.delay(1);
    this.fakeThing = thing;
    return null;
  }

  static newMethodMap = {
    '/session/:sessionId/fakedriver': {
      GET: {command: 'getFakeThing'},
      POST: {command: 'setFakeThing', payloadParams: {required: ['thing']}}
    },
  };

  static fakeRoute (req, res) {
    res.send(JSON.stringify({fakedriver: 'fakeResponse'}));
  }

  static async updateServer (expressApp/*, httpServer*/) { // eslint-disable-line require-await
    expressApp.all('/fakedriver', FakeDriver.fakeRoute);
  }

}

for (let [cmd, fn] of _.toPairs(commands)) {
  FakeDriver.prototype[cmd] = fn;
}

export { FakeDriver };
