import B from 'bluebird';
import {BaseDriver, errors} from 'appium/driver';
import {FakeApp} from './fake-app';
import {FakeDriverMixin} from './commands';

const FAKE_DRIVER_CONSTRAINTS = /** @type {const} */ ({
  app: {
    presence: true,
    isString: true,
  },
  uniqueApp: {
    isBoolean: true,
  },
});

/**
 * @typedef {typeof FAKE_DRIVER_CONSTRAINTS} FakeDriverConstraints
 */

/**
 * @extends {BaseDriver<FakeDriverConstraints>}
 * @implements {ExternalDriver<FakeDriverConstraints>}
 */
export class FakeDriverCore extends BaseDriver {
  desiredCapConstraints = FAKE_DRIVER_CONSTRAINTS;

  /** @type {string} */
  curContext;

  appModel = new FakeApp();

  constructor(opts = {}, shouldValidateCaps = true) {
    super(opts, shouldValidateCaps);
    this.curContext = 'NATIVE_APP';
    this.elMap = {};
    this.focusedElId = null;
    this.maxElId = 0;
    this.fakeThing = null;
    this._proxyActive = false;
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

  /**
   * @template [T=any]
   * @returns {Promise<T>}
   */
  async proxyCommand(/*url, method, body*/) {
    return /** @type {T} */ (/** @type {unknown} */ ('proxied via proxyCommand'));
  }

  /**
   *
   * @param {W3CFakeDriverCaps} jsonwpDesiredCapabilities
   * @param {W3CFakeDriverCaps} [jsonwpRequiredCaps]
   * @param {W3CFakeDriverCaps} [w3cCapabilities]
   * @param {import('@appium/types').DriverData[]} [otherSessionData]
   * @returns {Promise<[string,FakeDriverCaps]>}
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

    let [sessionId, caps] = /** @type {[string, FakeDriverCaps]} */ (
      await super.createSession(
        jsonwpDesiredCapabilities,
        jsonwpRequiredCaps,
        w3cCapabilities,
        otherSessionData
      )
    );
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
   * @returns {Promise<typeof this.cliArgs>}
   */
  async getFakeDriverArgs() {
    await B.delay(1);
    return this.cliArgs;
  }

  static newMethodMap = /** @type {const} */ ({
    '/session/:sessionId/fakedriver': {
      GET: {command: 'getFakeThing'},
      /**
       * Sets a fake thing
       */
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
    /**
     * Gets a thing (a fake thing)
     */
    'fake: getThing': {
      command: 'getFakeThing',
    },
    'fake: setThing': {
      command: 'setFakeThing',
      params: {required: ['thing']},
    },
  });

  /**
   * Add two or maybe even three numbers
   *
   * @param {number} num1
   * @param {number} num2
   * @param {number} [num3]
   * @returns {Promise<number>}
   */
  // eslint-disable-next-line no-unused-vars
  async fakeAddition(num1, num2, num3 = 0) {
    throw new errors.NotImplementedError();
  }

  static fakeRoute(req, res) {
    res.send(JSON.stringify({fakedriver: 'fakeResponse'}));
  }

  static async updateServer(expressApp, httpServer, cliArgs) {
    // eslint-disable-line require-await
    expressApp.all('/fakedriver', FakeDriverCore.fakeRoute);
    expressApp.all('/fakedriverCliArgs', (req, res) => {
      res.send(JSON.stringify(cliArgs));
    });
  }
}

/**
 * @extends FakeDriverCore
 */
export class FakeDriver extends FakeDriverMixin(FakeDriverCore) {}
export default FakeDriver;

/**
 * @typedef {import('./types').FakeDriverCaps} FakeDriverCaps
 * @typedef {import('./types').W3CFakeDriverCaps} W3CFakeDriverCaps
 */

/**
 * @template {import('@appium/types').Driver} D
 * @typedef {import('@appium/types').DriverClass<D>} DriverClass
 */

/**
 * @template {import('@appium/types').Constraints} C
 * @typedef {import('@appium/types').ExternalDriver<C>} ExternalDriver
 */
