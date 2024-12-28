import B from 'bluebird';
import {BaseDriver, errors} from 'appium/driver';
import {FakeApp} from './fake-app';

const FAKE_DRIVER_CONSTRAINTS = /** @type {const} */ ({
  app: {
    presence: true,
    isString: true,
  },
  uniqueApp: {
    isBoolean: true,
  },
  runClock: {
    isBoolean: true,
  },
});

/**
 * Constraints for {@linkcode FakeDriver}'s capabilites
 * @typedef {typeof FAKE_DRIVER_CONSTRAINTS} FakeDriverConstraints
 */

/**
 * @template [Thing=any]
 * @extends {BaseDriver<FakeDriverConstraints>}
 * @implements {ExternalDriver<FakeDriverConstraints>}
 */
export class FakeDriver extends BaseDriver {
  /**
   * @type {FakeDriverConstraints}
   * @readonly
   */
  desiredCapConstraints;

  /** @type {string} */
  curContext;

  /** @type {FakeApp} */
  appModel;

  /** @type {boolean} */
  _proxyActive;

  /** @type {boolean} */
  shook;

  /** @type {string?} */
  focusedElId;

  /** @type {Thing?} */
  fakeThing;

  /** @type {number} */
  maxElId;

  /** @type {Record<string,import('./fake-element').FakeElement>} */
  elMap;

  /** @type {string|null} */
  _bidiProxyUrl;

  /** @type {boolean} */
  _clockRunning = false;

  constructor(
    opts = /** @type {import('@appium/types').InitialOpts} */ ({}),
    shouldValidateCaps = true,
  ) {
    super(opts, shouldValidateCaps);
    this.curContext = 'NATIVE_APP';
    this.elMap = {};
    this.focusedElId = null;
    this.maxElId = 0;
    this.fakeThing = null;
    this._proxyActive = false;
    this.shook = false;
    this.appModel = new FakeApp();
    this.desiredCapConstraints = FAKE_DRIVER_CONSTRAINTS;
    this.doesSupportBidi = true;
    this._bidiProxyUrl = null;
  }

  proxyActive() {
    return this._proxyActive;
  }

  canProxy() {
    return true;
  }

  get bidiProxyUrl() {
    return this._bidiProxyUrl;
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
   * Comment for `createSession` in `FakeDriver`
   * @param {W3CFakeDriverCaps} w3cCapabilities1 W3C Capabilities
   * @param {W3CFakeDriverCaps} [w3cCapabilities2] W3C Capabilities
   * @param {W3CFakeDriverCaps} [w3cCapabilities3] W3C Capabilities
   * @param {import('@appium/types').DriverData[]} [driverData] Other session data
   * @override
   * @returns {Promise<[string,FakeDriverCaps]>}
   */
  async createSession(w3cCapabilities1, w3cCapabilities2, w3cCapabilities3, driverData = []) {
    // TODO add validation on caps.app that we will get for free from
    // BaseDriver

    // check to see if any other sessions have set uniqueApp. If so, emulate
    // not being able to start a session because of system resources
    for (let d of driverData) {
      if (d.isUnique) {
        throw new errors.SessionNotCreatedError(
          'Cannot start session; another ' +
            'unique session is in progress that requires all resources',
        );
      }
    }

    let [sessionId, caps] = /** @type {[string, FakeDriverCaps]} */ (
      await super.createSession(w3cCapabilities1, w3cCapabilities2, w3cCapabilities3, driverData)
    );
    this.caps = caps;
    await this.appModel.loadApp(caps.app);
    if (this.caps.runClock) {
      this.startClock();
    }
    return [sessionId, caps];
  }

  /**
   * @param {string} [sessionId]
   * @returns {Promise<void>}
   */
  async deleteSession(sessionId) {
    this.stopClock();
    return await super.deleteSession(sessionId);
  }

  /**
   * @returns {Promise<string>}
   */
  async getWindowHandle() {
    return '1';
  }

  /**
   * @returns {Promise<string[]>}
   */
  async getWindowHandles() {
    return ['1'];
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

  async startClock() {
    this._clockRunning = true;
    while (this._clockRunning) {
      await B.delay(500);
      this.eventEmitter.emit('bidiEvent', {
        method: 'clock.currentTime',
        params: {time: Date.now()},
      });
    }
  }

  stopClock() {
    this._clockRunning = false;
  }

  /**
   * Set the 'thing' value (so that it can be retrieved later)
   *
   * @param {Thing} thing
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

  /**
   * This is a command that will return a list of deprecated command names called
   *
   * @returns {Promise<string[]>}
   */
  async getDeprecatedCommandsCalled() {
    await B.delay(1);
    // TODO: Properly get deprecatedCommandsLogged list from the base-driver
    return [];
  }

  /**
   * This is a command that exists just to be an example of a deprecated command
   *
   * @returns {Promise<void>}
   */
  async callDeprecatedCommand() {
    await B.delay(1);
  }

  static newBidiCommands = /** @type {const} */({
    fake: {
      getFakeThing: {
        command: 'getFakeThing',
      },
      setFakeThing: {
        command: 'setFakeThing',
        params: {
          required: ['thing'],
        },
      },
    }
  });

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
    '/session/:sessionId/deprecated': {
      POST: {command: 'callDeprecatedCommand', deprecated: true},
    },
    // this next one exists to override a deprecated method
    '/session/:sessionId/doubleclick': {
      POST: {command: 'doubleClick'},
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
    'fake: getDeprecatedCommandsCalled': {
      command: 'getDeprecatedCommandsCalled',
    },
  });

  static fakeRoute(req, res) {
    res.send(JSON.stringify({fakedriver: 'fakeResponse'}));
  }

  static async updateServer(expressApp, httpServer, cliArgs) {

    expressApp.all('/fakedriver', FakeDriver.fakeRoute);
    expressApp.all('/fakedriverCliArgs', (req, res) => {
      res.send(JSON.stringify(cliArgs));
    });
  }
}

import './commands';

export default FakeDriver;

/**
 * @typedef {import('./types').FakeDriverCaps} FakeDriverCaps
 * @typedef {import('./types').W3CFakeDriverCaps} W3CFakeDriverCaps
 * @typedef {import('@appium/types').Element} Element
 */

/**
 * @template {import('@appium/types').Driver} D
 * @typedef {import('@appium/types').DriverClass<D>} DriverClass
 */

/**
 * @template {import('@appium/types').Constraints} C
 * @typedef {import('@appium/types').ExternalDriver<C>} ExternalDriver
 */

/**
 * @typedef {import('@appium/types').Orientation} Orientation
 */
