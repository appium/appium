import B from 'bluebird';
import {BaseDriver, errors} from 'appium/driver';
import {deprecatedCommandsLogged} from '@appium/base-driver/build/lib/protocol/protocol';
import {FakeApp} from './fake-app';
import {alert, contexts, element, find, general} from './commands';

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
export class FakeDriver extends BaseDriver {
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
    this.shook = false;
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
            'unique session is in progress that requires all resources'
        );
      }
    }

    let [sessionId, caps] = /** @type {[string, FakeDriverCaps]} */ (
      await super.createSession(w3cCapabilities1, w3cCapabilities2, w3cCapabilities3, driverData)
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

  /**
   * This is a command that will return a list of deprecated command names called
   *
   * @returns {Promise<string[]>}
   */
  async getDeprecatedCommandsCalled() {
    await B.delay(1);
    return Array.from(deprecatedCommandsLogged);
  }

  /**
   * This is a command that exists just to be an example of a deprecated command
   *
   * @returns {Promise<void>}
   */
  async callDeprecatedCommand() {
    await B.delay(1);
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
    // eslint-disable-line require-await
    expressApp.all('/fakedriver', FakeDriver.fakeRoute);
    expressApp.all('/fakedriverCliArgs', (req, res) => {
      res.send(JSON.stringify(cliArgs));
    });
  }

  /*********
   * ALERT *
   *********/
  assertNoAlert = alert.assertNoAlert;
  assertAlert = alert.assertAlert;
  getAlertText = alert.getAlertText;
  setAlertText = alert.setAlertText;
  postAcceptAlert = alert.postAcceptAlert;
  postDismissAlert = alert.postDismissAlert;

  /************
   * CONTEXTS *
   ************/
  getRawContexts = contexts.getRawContexts;
  assertWebviewContext = contexts.assertWebviewContext;
  getCurrentContext = contexts.getCurrentContext;
  getContexts = contexts.getContexts;
  setContext = contexts.setContext;
  setFrame = contexts.setFrame;

  /************
   * ELEMENTS *
   ************/
  getElements = element.getElements;
  getElement = element.getElement;
  getName = element.getName;
  elementDisplayed = element.elementDisplayed;
  elementEnabled = element.elementEnabled;
  elementSelected = element.elementSelected;
  setValue = element.setValue;
  getText = element.getText;
  clear = element.clear;
  click = element.click;
  getAttribute = element.getAttribute;
  getElementRect = element.getElementRect;
  getSize = element.getSize;
  equalsElement = element.equalsElement;
  getCssProperty = element.getCssProperty;
  getLocation = element.getLocation;
  getLocationInView = element.getLocationInView;

  /********
   * FIND *
   ********/
  getExistingElementForNode = find.getExistingElementForNode;
  wrapNewEl = find.wrapNewEl;
  findElOrEls = find.findElOrEls;
  findElement = find.findElement;
  findElements = find.findElements;
  findElementFromElement = find.findElementFromElement;
  findElementsFromElement = find.findElementsFromElement;

  /***********
   * GENERAL *
   ***********/
  title = general.title;
  keys = general.keys;
  setGeoLocation = general.setGeoLocation;
  getGeoLocation = general.getGeoLocation;
  getPageSource = general.getPageSource;
  getOrientation = general.getOrientation;
  setOrientation = general.setOrientation;
  getScreenshot = general.getScreenshot;
  getWindowSize = general.getWindowSize;
  getWindowRect = general.getWindowRect;
  performActions = general.performActions;
  getLog = general.getLog;
  mobileShake = general.mobileShake;
  doubleClick = general.doubleClick;
  execute = general.execute;
  fakeAddition = general.fakeAddition;
  releaseActions = general.releaseActions;
}

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
