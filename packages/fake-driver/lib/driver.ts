import {sleep} from 'asyncbox';
import type {Express, Request, Response} from 'express';
import type {Server as HttpServer} from 'node:http';
import {BaseDriver, errors} from 'appium/driver';
import type {DriverData, InitialOpts} from '@appium/types';
import {desiredCapConstraints} from './desired-caps';
import type {FakeDriverConstraints} from './desired-caps';
import type {FakeDriverCaps, W3CFakeDriverCaps} from './types';
import {FakeApp} from './fake-app';
import type {FakeElement} from './fake-element';
import * as alertCommands from './commands/alert';
import * as contextsCommands from './commands/contexts';
import * as elementCommands from './commands/element';
import * as findCommands from './commands/find';
import * as generalCommands from './commands/general';
import {NEW_BIDI_COMMANDS} from './command-maps/new-bidi-commands';
import {NEW_METHOD_MAP} from './command-maps/new-method-map';
import {EXECUTE_METHOD_MAP} from './command-maps/execute-method-map';

export type {FakeDriverConstraints};
export type {Orientation} from '@appium/types';

/** Driver supporting a generic "fake thing" value (getFakeThing / setFakeThing). */
export class FakeDriver<Thing = unknown> extends BaseDriver<FakeDriverConstraints> {
  static newBidiCommands = NEW_BIDI_COMMANDS;
  static newMethodMap = NEW_METHOD_MAP;
  static executeMethodMap = EXECUTE_METHOD_MAP;

  readonly desiredCapConstraints = desiredCapConstraints;

  curContext: string;
  readonly appModel: FakeApp;
  _proxyActive: boolean;
  shook: boolean;
  focusedElId: string | null;
  fakeThing: Thing | null;
  /** Next numeric id for new elements; keys in elMap are stringified. */
  maxElId: number;
  /** Map of element id (string) to FakeElement for this session. */
  elMap: Record<string, FakeElement>;
  /** Current document URL; set by bidiNavigate, returned by getUrl. */
  url: string = '';

  // Alert commands
  assertNoAlert = alertCommands.assertNoAlert;
  assertAlert = alertCommands.assertAlert;
  getAlertText = alertCommands.getAlertText;
  setAlertText = alertCommands.setAlertText;
  postAcceptAlert = alertCommands.postAcceptAlert;
  postDismissAlert = alertCommands.postDismissAlert;

  // Context commands
  getRawContexts = contextsCommands.getRawContexts;
  assertWebviewContext = contextsCommands.assertWebviewContext;
  getCurrentContext = contextsCommands.getCurrentContext;
  getContexts = contextsCommands.getContexts;
  setContext = contextsCommands.setContext;
  setFrame = contextsCommands.setFrame;

  // Element commands
  getElements = elementCommands.getElements;
  getElement = elementCommands.getElement;
  getName = elementCommands.getName;
  elementDisplayed = elementCommands.elementDisplayed;
  elementEnabled = elementCommands.elementEnabled;
  elementSelected = elementCommands.elementSelected;
  setValue = elementCommands.setValue;
  getText = elementCommands.getText;
  clear = elementCommands.clear;
  click = elementCommands.click;
  getAttribute = elementCommands.getAttribute;
  getElementRect = elementCommands.getElementRect;
  getSize = elementCommands.getSize;
  equalsElement = elementCommands.equalsElement;
  getCssProperty = elementCommands.getCssProperty;
  getLocation = elementCommands.getLocation;
  getLocationInView = elementCommands.getLocationInView;

  // Find commands
  getExistingElementForNode = findCommands.getExistingElementForNode;
  wrapNewEl = findCommands.wrapNewEl;
  findElOrEls = findCommands.findElOrEls;
  findElement = findCommands.findElement;
  findElements = findCommands.findElements;
  findElementFromElement = findCommands.findElementFromElement;
  findElementsFromElement = findCommands.findElementsFromElement;

  // General commands
  title = generalCommands.title;
  keys = generalCommands.keys;
  setGeoLocation = generalCommands.setGeoLocation;
  getGeoLocation = generalCommands.getGeoLocation;
  getPageSource = generalCommands.getPageSource;
  getOrientation = generalCommands.getOrientation;
  setOrientation = generalCommands.setOrientation;
  getScreenshot = generalCommands.getScreenshot;
  getWindowSize = generalCommands.getWindowSize;
  getWindowRect = generalCommands.getWindowRect;
  performActions = generalCommands.performActions;
  releaseActions = generalCommands.releaseActions;
  getLog = generalCommands.getLog;
  mobileShake = generalCommands.mobileShake;
  doubleClick = generalCommands.doubleClick;
  execute = generalCommands.execute;
  fakeAddition = generalCommands.fakeAddition;
  getUrl = generalCommands.getUrl;
  bidiNavigate = generalCommands.bidiNavigate;
  getLastPluginMath = generalCommands.getLastPluginMath;

  protected lastPluginMath: {pluginName: string, result: number} | null;

  /** If set, Bidi connections are proxied to this URL instead of handling locally. */
  private _bidiProxyUrl: string | null;
  private _clockRunning = false;

  constructor(opts: InitialOpts = {} as InitialOpts, shouldValidateCaps = true) {
    super(opts, shouldValidateCaps);
    this.curContext = 'NATIVE_APP';
    this.elMap = {};
    this.focusedElId = null;
    this.maxElId = 0;
    this.fakeThing = null;
    this._proxyActive = false;
    this.shook = false;
    this.appModel = new FakeApp();
    this._bidiProxyUrl = null;
    this.lastPluginMath = null;
  }

  get bidiProxyUrl(): string | null {
    return this._bidiProxyUrl;
  }

  override get driverData(): {isUnique: boolean} {
    return {
      isUnique: !!this.caps.uniqueApp,
    };
  }

  static fakeRoute(_req: Request, res: Response): void {
    res.send(JSON.stringify({fakedriver: 'fakeResponse'}));
  }

  static async updateServer(
    expressApp: Express,
    _httpServer: HttpServer,
    cliArgs: Record<string, unknown>
  ): Promise<void> {
    expressApp.all('/fakedriver', FakeDriver.fakeRoute);
    expressApp.all('/fakedriverCliArgs', (_req: Request, res: Response) => {
      res.send(JSON.stringify(cliArgs));
    });
  }

  onIpcInit(): void {
    this.ipcSubscribe('pluginMath', (pluginName: string, result: number) => {
      this.log.info(`A connected plugin did some math with result ${result}`);
      this.lastPluginMath = {pluginName, result};
    });
    this.publishClockStatus();
  }

  proxyActive(): boolean {
    return this._proxyActive;
  }

  canProxy(): boolean {
    return true;
  }

  proxyReqRes(req: Request, res: Response): void {
    res.set('content-type', 'application/json');
    const resBodyObj: {value: string; sessionId: string | null} = {
      value: 'proxied via proxyReqRes',
      sessionId: null,
    };
    const match = req.originalUrl.match(/\/session\/([^/]+)/);
    resBodyObj.sessionId = match ? match[1] : null;
    res.status(200).send(JSON.stringify(resBodyObj));
  }

  async proxyCommand<T = unknown>(): Promise<T> {
    return 'proxied via proxyCommand' as T;
  }

  /**
   * Create session and load fake app XML from caps.app.
   * Starts clock event emitter if caps.runClock is true.
   */
  override async createSession(
    w3cCapabilities1: W3CFakeDriverCaps,
    w3cCapabilities2?: W3CFakeDriverCaps,
    w3cCapabilities3?: W3CFakeDriverCaps,
    driverData: DriverData[] = []
  ): Promise<[string, FakeDriverCaps]> {
    for (const d of driverData) {
      if (d.isUnique) {
        throw new errors.SessionNotCreatedError(
          'Cannot start session; another ' +
            'unique session is in progress that requires all resources'
        );
      }
    }

    const [sessionId, caps] = await super.createSession(
      w3cCapabilities1,
      w3cCapabilities2,
      w3cCapabilities3,
      driverData
    ) as [string, FakeDriverCaps];
    this.caps = caps;
    await this.appModel.loadApp(caps.app);
    if (this.caps.runClock) {
      void this.startClock();
    }
    return [sessionId, caps];
  }

  override async deleteSession(sessionId?: string): Promise<void> {
    this.stopClock();
    return await super.deleteSession(sessionId);
  }

  async getWindowHandle(): Promise<string> {
    return '1';
  }

  async getWindowHandles(): Promise<string[]> {
    return ['1'];
  }

  async getFakeThing(): Promise<Thing | null> {
    await sleep(1);
    return this.fakeThing;
  }

  async setFakeThing(thing: Thing): Promise<null> {
    await sleep(1);
    this.fakeThing = thing;
    this.ipcPublish('fakeThing', thing);
    return null;
  }

  async getFakeDriverArgs(): Promise<typeof this.cliArgs> {
    await sleep(1);
    return this.cliArgs;
  }

  /** TODO: track deprecated commands when called and return their names. */
  async getDeprecatedCommandsCalled(): Promise<string[]> {
    await sleep(1);
    return [];
  }

  async callDeprecatedCommand(): Promise<void> {
    await sleep(1);
  }

  async doSomeMath(num1: number, num2: number): Promise<number> {
    await sleep(1);
    return num1 + num2;
  }

  async doSomeMath2(num1: number, num2: number): Promise<number> {
    await sleep(1);
    return num1 + num2;
  }

  async fakeStartClock(): Promise<void> {
    void this.startClock();
  }

  async fakeStopClock(): Promise<void> {
    this.stopClock();
  }

  private async startClock(): Promise<void> {
    this._clockRunning = true;
    this.publishClockStatus();
    while (this._clockRunning) {
      await sleep(500);
      this.eventEmitter.emit('bidiEvent', {
        method: 'appium:clock.currentTime',
        params: {time: Date.now()},
      });
    }
  }

  private stopClock(): void {
    this._clockRunning = false;
    this.publishClockStatus();
  }

  private publishClockStatus(): void {
    this.ipcPublish('clockLifecycle', {running: this._clockRunning});
  }

}
