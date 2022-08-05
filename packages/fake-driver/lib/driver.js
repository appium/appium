import B from 'bluebird';
import _ from 'lodash';
import {BaseDriver, errors} from 'appium/driver';
import {FakeApp} from './fake-app';
import commands from './commands';

class FakeDriver extends BaseDriver {
  constructor(opts = {}, shouldValidateCaps = true) {
    super(opts, shouldValidateCaps);
    this.appModel = null;
    this.curContext = 'NATIVE_APP';
    this.elMap = {};
    this.focusedElId = null;
    this.maxElId = 0;
    this.caps = {};
    this.fakeThing = null;
    this.cliArgs = {};
    this._proxyActive = false;

    this.desiredCapConstraints = {
      app: {
        presence: true,
        isString: true,
      },
    };
  }

  proxyActive() {
    return this._proxyActive;
  }

  canProxy() {
    return true;
  }

  proxyReqRes(req, res) {
    // fake implementation of jwp proxy req res
    res.set('content-type', 'application/json');
    const resBodyObj = {value: 'proxied via proxyReqRes'};
    const match = req.originalUrl.match(/\/session\/([^/]+)/);
    resBodyObj.sessionId = match ? match[1] : null;
    res.status(200).send(JSON.stringify(resBodyObj));
  }

  proxyCommand(/*url, method, body*/) {
    return 'proxied via proxyCommand';
  }

  async createSession(
    jsonwpDesiredCapabilities,
    jsonwpRequiredCaps,
    w3cCapabilities,
    otherSessionData = []
  ) {
    // TODO add validation on caps.app that we will get for free from
    // BaseDriver

    // check to see if any other sessions have set uniqueApp. If so, emulate
    // not being able to start a session because of system resources
    for (let d of otherSessionData) {
      if (d.isUnique) {
        throw new errors.SessionNotCreatedError(
          'Cannot start session; another ' +
            'unique session is in progress that requires all resources'
        );
      }
    }

    let [sessionId, caps] = await super.createSession(
      jsonwpDesiredCapabilities,
      jsonwpRequiredCaps,
      w3cCapabilities,
      otherSessionData
    );
    this.appModel = new FakeApp();
    if (_.isArray(caps) === true && caps.length === 1) {
      caps = caps[0];
    }
    this.caps = caps;
    await this.appModel.loadApp(caps.app);
    return [sessionId, caps];
  }

  get driverData() {
    return {
      isUnique: !!this.caps.uniqueApp,
    };
  }

  async getFakeThing() {
    await B.delay(1);
    return this.fakeThing;
  }

  async setFakeThing(thing) {
    await B.delay(1);
    this.fakeThing = thing;
    return null;
  }

  async getFakeDriverArgs() {
    await B.delay(1);
    return this.cliArgs;
  }

  static newMethodMap = {
    '/session/:sessionId/fakedriver': {
      GET: {command: 'getFakeThing'},
      POST: {command: 'setFakeThing', payloadParams: {required: ['thing']}},
    },
    '/session/:sessionId/fakedriverargs': {
      GET: {command: 'getFakeDriverArgs'},
    },
  };

  static fakeRoute(req, res) {
    res.send(JSON.stringify({fakedriver: 'fakeResponse'}));
  }

  static async updateServer(expressApp, httpServer, cliArgs) {
    // eslint-disable-line require-await
    expressApp.all('/fakedriver', FakeDriver.fakeRoute);
    expressApp.all('/fakedriverCliArgs', (req, res) => {
      res.send(JSON.stringify(cliArgs));
    });
  }
}

Object.assign(FakeDriver.prototype, commands);

export {FakeDriver};
