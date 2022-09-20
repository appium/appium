// @ts-check

import B from 'bluebird';
import {BaseDriver, errors} from 'appium/driver';
import {FakeApp} from './fake-app';
import commands from './commands';

const CONSTRAINTS = /** @type {const} */ ({
  app: {
    presence: true,
    isString: true,
  },
  uniqueApp: {
    isBoolean: true,
  },
});

/**
 */
class FakeDriver extends BaseDriver {
  constructor(opts = {}, shouldValidateCaps = true) {
    super(opts, shouldValidateCaps);
    this.appModel = null;
    this.curContext = 'NATIVE_APP';
    this.elMap = {};
    this.focusedElId = null;
    this.maxElId = 0;
    this.fakeThing = null;
    this.cliArgs = {};
    this._proxyActive = false;

    this.desiredCapConstraints = CONSTRAINTS;
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

  /**
   *
   * @param {W3CCapabilities} jsonwpDesiredCapabilities
   * @param {W3CCapabilities} [jsonwpRequiredCaps]
   * @param {W3CCapabilities} [w3cCapabilities]
   * @param {import('@appium/types').DriverData[]} [otherSessionData]
   * @returns {Promise<[string, any]>}
   */
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

    let [sessionId, caps] =
      /** @type {[string, import('@appium/types').DriverCaps<FakeDriver>]} */ (
        await super.createSession(
          jsonwpDesiredCapabilities,
          jsonwpRequiredCaps,
          w3cCapabilities,
          otherSessionData
        )
      );
    this.appModel = new FakeApp();
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

  /**
   * Set the 'thing' value (so that it can be retrieved later)
   *
   * @appiumCommand
   * @param {any} thing
   * @returns {Promise<null>}
   */
  async setFakeThing(thing) {
    await B.delay(1);
    this.fakeThing = thing;
    return null;
  }

  /**
   * Get the driver args that were sent in via the CLI
   *
   * @appiumCommand
   * @returns {Promise<Record<string, any>>}
   */
  async getFakeDriverArgs() {
    await B.delay(1);
    return this.cliArgs;
  }

  static newMethodMap = /** @type {const} */ ({
    '/session/:sessionId/fakedriver': {
      GET: {command: 'getFakeThing'},
      POST: {command: 'setFakeThing', payloadParams: {required: ['thing']}},
    },
    '/session/:sessionId/fakedriverargs': {
      GET: {command: 'getFakeDriverArgs'},
    },
  });

  static executeMethodMap = /** @type {const} */ ({
    'fake: addition': {
      command: 'fakeAddition',
      params: {required: ['num1', 'num2'], optional: ['num3']},
    },
    'fake: getThing': {
      command: 'getFakeThing',
    },
    'fake: setThing': {
      command: 'setFakeThing',
      params: {required: ['thing']},
    },
  });

  // eslint-disable-next-line no-unused-vars
  async fakeAddition(num1, num2, num3 = 0) {}

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

/**
 * @typedef {import('@appium/types').W3CCapabilities} W3CCapabilities
 * @typedef {import('@appium/types').ExternalDriver} ExternalDriver
 */

/**
 * @template {import('@appium/types').Driver} D
 * @typedef {import('@appium/types').DriverClass<D>} DriverClass
 */
