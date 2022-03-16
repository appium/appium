import {Method as _Method} from 'axios';
import {Logger} from 'npmlog';
import {Server} from 'http';
export interface Driver {
  // fields
  sessionId: string;
  opts: DriverOpts;
  initialOpts: DriverOpts;
  caps?: Record<string, any>;
  originalCaps?: Record<string, any>;
  helpers: DriverHelpers;
  basePath: string;
  relaxedSecurityEnabled: boolean;
  allowInsecure: string[];
  denyInsecure: string[];
  newCommandTimeoutMs: number;
  implicitWaitMs: number;
  locatorStrategies: string[];
  webLocatorStrategies: string[];
  settings: DeviceSettings;
  protocol?: string;
  supportedLogTypes: Record<string, LogType<Driver>>;

  driverData: any;
  isCommandsQueueEnabled: boolean;

  eventHistory: EventHistory;

  server?: AppiumServer;
  serverHost?: string;
  serverPort?: number;
  serverPath?: string;

  isW3CProtocol(): boolean;
  isMjsonwpProtocol(): boolean;
  log: object;
  desiredCapConstraints: Constraints;

  // non-command methods
  onUnexpectedShutdown(handler: () => any): void;
  logEvent(eventName: string): void;
  getStatus(): Promise<{}>;
  sessionExists(sessionId: string): boolean;
  logExtraCaps(caps: {}): void;
  validateDesiredCaps(caps: {}): boolean;
  isFeatureEnabled(name: string): boolean;
  ensureFeatureEnabled(name: string): void;
  executeCommand(cmd: string, ...args: any[]): Promise<any>;
  startUnexpectedShutdown(err?: Error): Promise<void>;
  validateLocatorStrategy(strategy: string, webContext?: boolean): void;
  proxyActive(): boolean;
  getProxyAvoidList(sessionId: string): [string, RegExp][];
  canProxy(): boolean;
  proxyRouteIsAvoided(sessionId: string, method: string, url: string): boolean;
  addManagedDriver(driver: Driver): void;
  getManagedDrivers(): Driver[];
  clearNewCommandTimeout(): Promise<void>;
  startNewCommandTimeout(): Promise<void>;

  setNewCommandTimeout?(ms: number): void;

  setImplicitWait?(ms: number): void;
  implicitWaitForCondition(condition: () => Promise<any>): Promise<unknown>;

  // Commands
  findElOrEls(
    strategy: string,
    selector: string,
    mult: boolean,
    context: string,
  ): Promise<Element | Element[]>;
  newCommandTimeout(ms: number): Promise<void>;
  getLogTypes(): Promise<string[]>;
  getLog(logType: string): Promise<{}[]>;

  // WebDriver
  createSession(
    jwpCaps: any,
    jwpReqCaps: any,
    w3cCaps: any,
  ): Promise<[string, any]>;
  deleteSession(sessionId?: string): Promise<void>;
  getSessions(): Promise<{id: string; capabilities: {}}[]>;
  getSession(): Promise<{}>;
  getTimeouts(): Promise<Record<string, number>>;
  timeouts(
    type: string,
    ms: number,
    script: number,
    pageLoad: number,
    implicit: number,
  ): Promise<void>;
  setUrl?(url: string): Promise<void>;
  getUrl?(): Promise<string>;
  back?(): Promise<void>;
  forward?(): Promise<void>;
  refresh?(): Promise<void>;
  title?(): Promise<string>;
  getWindowHandle?(): Promise<string>;
  closeWindow?(): Promise<string[]>;
  setWindow?(handle: string): Promise<void>;
  getWindowHandles?(): Promise<string[]>;
  setFrame?(id: null | number | string): Promise<void>;
  getWindowRect?(): Promise<Rect>;
  setWindowRect?(
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<Rect>;
  maximizeWindow?(): Promise<Rect>;
  minimizeWindow?(): Promise<Rect>;
  fullScreenWindow?(): Promise<Rect>;
  active?(): Promise<Element>;
  findElement(strategy: string, selector: string): Promise<Element>;
  findElements(strategy: string, selector: string): Promise<Element[]>;
  findElementFromElement(
    strategy: string,
    selector: string,
    elementId: string,
  ): Promise<Element>;
  findElementsFromElement(
    strategy: string,
    selector: string,
    elementId: string,
  ): Promise<Element[]>;
  elementSelected?(elementId: string): Promise<boolean>;
  getAttribute?(name: string, elementId: string): Promise<string | null>;
  getProperty?(name: string, elementId: string): Promise<string | null>;
  getCssProperty?(name: string, elementId: string): Promise<string>;
  getText?(elementId: string): Promise<string>;
  getName?(elementId: string): Promise<string>;
  getElementRect?(elementId: string): Promise<Rect>;
  elementEnabled?(elementId: string): Promise<boolean>;
  elementDisplayed?(elementId: string): Promise<boolean>;
  click?(elementId: string): Promise<void>;
  clear?(elementId: string): Promise<void>;
  setValue?(text: string, elementId: string): Promise<void>;
  getPageSource?(): Promise<string>;
  execute?(script: string, args: unknown[]): Promise<unknown>;
  executeAsync?(script: string, args: unknown[]): Promise<unknown>;
  getCookies?(): Promise<Cookie[]>;
  getCookie?(name: string): Promise<Cookie>;
  setCookie?(cookie: Cookie): Promise<void>;
  deleteCookie?(name: string): Promise<void>;
  deleteCookies?(): Promise<void>;
  performActions?(actions: Actions[]): Promise<void>;
  releaseActions?(): Promise<void>;
  postDismissAlert?(): Promise<void>;
  postAcceptAlert?(): Promise<void>;
  getAlertText?(): Promise<string | null>;
  setAlertText?(text: string): Promise<void>;
  getScreenshot?(): Promise<string>;
  getElementScreenshot?(elementId: string): Promise<string>;

  // Appium W3C WebDriver Extension
  mobileShake?(): Promise<void>;
  getDeviceTime?(format?: string): Promise<string>;
  lock?(seconds?: number): Promise<void>;
  unlock?(): Promise<void>;
  isLocked?(): Promise<boolean>;
  startRecordingScreen?(options?: ScreenRecordOptions): Promise<void>;
  stopRecordingScreen?(options?: ScreenRecordOptions): Promise<string>;
  getPerformanceDataTypes?(): Promise<string[]>;
  getPerformanceData?(
    packageName: string,
    dataType: string,
    dataReadTimeout?: number,
  ): Promise<string[]>;
  pressKeyCode?(
    keycode: number,
    metastate?: number,
    flags?: number,
  ): Promise<void>;
  longPressKeyCode?(
    keycode: number,
    metastate?: number,
    flags?: number,
  ): Promise<void>;
  fingerprint?(fingerprintId: number): Promise<void>;
  sendSMS?(phoneNumber: string, message: string): Promise<void>;
  gsmCall?(phoneNumber: string, action: string): Promise<void>;
  gsmSignal?(signalStrength: string): Promise<void>;
  gsmVoice?(state: string): Promise<void>;
  powerCapacity?(percent: number): Promise<void>;
  powerAC?(state: string): Promise<void>;
  networkSpeed?(netspeed: string): Promise<void>;
  keyevent?(keycode: string, metastate?: string): Promise<void>;
  mobileRotation?(
    x: number,
    y: number,
    radius: number,
    rotation: number,
    touchCount: number,
    duration: string,
    elementId?: string,
  ): Promise<void>;
  getCurrentActivity?(): Promise<string>;
  getCurrentPackage?(): Promise<string>;
  installApp?(appPath: string, options?: unknown): Promise<void>;
  activateApp?(appId: string, options?: unknown): Promise<void>;
  removeApp?(appId: string, options?: unknown): Promise<void>;
  terminateApp?(appId: string, options?: unknown): Promise<void>;
  isAppInstalled?(appId: string): Promise<boolean>;
  queryAppState?(appId: string): Promise<number>;
  hideKeyboard?(
    strategy?: string,
    key?: string,
    keyCode?: string,
    keyName?: string,
  ): Promise<void>;
  isKeyboardShown?(): Promise<boolean>;
  pushFile?(path: string, data: string): Promise<void>;
  pullFile?(path: string): Promise<string>;
  pullFolder?(path: string): Promise<string>;
  toggleFlightMode?(): Promise<void>;
  toggleData?(): Promise<void>;
  toggleWiFi?(): Promise<void>;
  toggleLocationServices?(): Promise<void>;
  openNotifications?(): Promise<void>;
  startActivity?(
    appPackage: string,
    appActivity: string,
    appWaitPackage?: string,
    appWaitActivity?: string,
    intentAction?: string,
    intentCategory?: string,
    intentFlags?: string,
    optionalIntentArguments?: string,
    dontStopAppOnReset?: boolean,
  ): Promise<void>;
  getSystemBars?(): Promise<unknown[]>;
  getDisplayDensity?(): Promise<number>;
  touchId?(match: boolean): Promise<void>;
  toggleEnrollTouchId?(enabled: boolean): Promise<void>;
  launchApp?(): Promise<void>;
  closeApp?(): Promise<void>;
  reset(): Promise<void>;
  background?(seconds: null | number): Promise<void>;
  endCoverage?(intent: string, path: string): Promise<void>;
  getStrings?(
    language?: string,
    stringFile?: string,
  ): Promise<Record<string, unknown>>;
  setValueImmediate?(value: string, elementId: string): Promise<void>;
  replaceValue?(value: string, elementId: string): Promise<void>;
  updateSettings(newSettings: Record<string, unknown>): Promise<void>;
  getSettings(): Promise<Record<string, unknown>>;
  receiveAsyncResponse?(response: unknown): Promise<void>;
  getLogEvents(type?: string | string[]): EventHistory | Record<string, number>;
  logCustomEvent(vendor: string, event: string): void;
  setClipboard?(
    content: string,
    contentType?: string,
    label?: string,
  ): Promise<void>;
  getClipboard?(contentType?: string): Promise<string>;

  // JSONWP
  asyncScriptTimeout?(ms: number): Promise<void>;
  implicitWait(ms: number): Promise<void>;
  getWindowSize?(): Promise<Size>;
  getLocation?(elementId: string): Promise<Position>;
  getLocationInView?(elementId: string): Promise<Position>;
  getSize?(elementId: string): Promise<Size>;
  equalsElement?(elementId: string, otherElementId: string): Promise<boolean>;
  submit?(elementId: string): Promise<void>;
  keys?(value: string[]): Promise<void>;
  availableIMEEngines?(): Promise<string[]>;
  getActiveIMEEngine?(): Promise<string>;
  isIMEActivated?(): Promise<boolean>;
  deactivateIMEEngine?(): Promise<void>;
  activateIMEEngine?(engine: string): Promise<void>;
  getOrientation?(): Promise<string>;
  setOrientation?(orientation: string): Promise<void>;
  moveTo?(
    element?: null | string,
    xOffset?: number,
    yOffset?: number,
  ): Promise<void>;
  buttonDown?(button?: number): Promise<void>;
  buttonUp?(button?: number): Promise<void>;
  clickCurrent?(button?: number): Promise<void>;
  doubleClick?(): Promise<void>;
  touchDown?(x: number, y: number): Promise<void>;
  touchUp?(x: number, y: number): Promise<void>;
  touchMove?(x: number, y: number): Promise<void>;
  touchLongClick?(elementId: string): Promise<void>;
  flick?(
    element?: string,
    xSpeed?: number,
    ySpeed?: number,
    xOffset?: number,
    yOffset?: number,
    speed?: number,
  ): Promise<void>;
  getGeoLocation?(): Promise<Location>;
  setGeoLocation?(location: Partial<Location>): Promise<void>;

  // MJSONWIRE
  getCurrentContext?(): Promise<string | null>;
  setContext?(name: string): Promise<void>;
  getContexts?(): Promise<string[]>;
  getPageIndex?(elementId: string): Promise<string>;
  getNetworkConnection?(): Promise<number>;
  setNetworkConnection?(type: number): Promise<void>;
  performTouch?(actions: unknown): Promise<void>;
  performMultiAction?(actions: unknown, elementId: string): Promise<void>;
  getRotation?(): Promise<Rotation>;
  setRotation?(x: number, y: number, z: number): Promise<void>;

  // Chromium DevTools
  executeCdp?(cmd: string, params: unknown): Promise<unknown>;

  // Web Authentication
  addVirtualAuthenticator?(
    protocol: string,
    transport: string,
    hasResidentKey?: boolean,
    hasUserVerification?: boolean,
    isUserConsenting?: boolean,
    isUserVerified?: boolean,
  ): Promise<void>;
  removeVirtualAuthenticator?(): Promise<void>;
  addAuthCredential?(
    credentialId: string,
    isResidentCredential: boolean,
    rpId: string,
    privateKey: string,
    userHandle?: string,
    signCount?: number,
  ): Promise<void>;
  getAuthCredential?(): Promise<Credential[]>;
  removeAllAuthCredentials?(): Promise<void>;
  removeAuthCredential?(): Promise<void>;
  setUserAuthVerified?(isUserVerified: boolean): Promise<void>;
}

export interface Method {
  command?: string;
  neverProxy?: boolean;
  payloadParams?: PayloadParams;
}

export interface PayloadParams {
  wrap?: string;
  unwrap?: string;
  required?: string[] | string[][];
  optional?: string[] | string[][];
  validate?: <T>(obj: T, protocol: string) => T;
  makeArgs?: (obj: any) => any;
}

export type MethodMap = Record<string, Record<string, Method>>;

export interface Constraint {
  presence?: boolean | {allowEmpty: boolean};
  isString?: boolean;
  isNumber?: boolean;
  isBoolean?: boolean;
  isObject?: boolean;
  isArray?: boolean;
  deprecated?: boolean;
  inclusion?: any[];
}
export type Constraints = Record<string, Constraint>;

export interface DriverOpts {
  tmpDir: string;
  [key: string]: any;
}

export interface Element {
  'element-6066-11e4-a52e-4f735466cecf': string;
}

export interface DriverHelpers {
  configureApp: (
    app: string,
    supportedAppExtensions: string[],
  ) => Promise<string>;
  isPackageOrBundle: (app: string) => boolean;
  duplicateKeys: <T>(input: T, firstKey: string, secondKey: string) => T;
  parseCapsArray: (cap: string | string[]) => string[];
}

export type SettingsUpdater = (
  prop: string,
  newValue: {},
  curValue: {},
) => Promise<void>;

export class DeviceSettings {
  constructor(defaultSettings: {}, onSettingsUpdate: SettingsUpdater);
  update(newSettings: {}): Promise<void>;
  getSettings(): Record<string, unknown>;
}

export type LogType<TDriver> = {
  description: string;
  getter: (driver: TDriver) => Promise<any[]>;
};

// WebDriver

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Cookie {
  name: string;
  value: string;
  path?: string;
  domain?: string;
  secure?: boolean;
  httpOnly?: boolean;
  expiry?: number;
  sameSite?: 'Lax' | 'Strict';
}

export interface Actions {
  type?: string;
  actions: Action[];
  parameters?: {
    pointerType?: string;
  };
}

export interface Action {
  duration?: number;
  type: string;
  value?: string;
  x?: number;
  y?: number;
  button?: number;
  origin?: string;
}

// Appium W3C WebDriver Extension

export interface ScreenRecordOptions {
  remotePath?: string;
  username?: string;
  password?: string;
  method?: string;
  forceRestart?: boolean;
  timeLimit?: string;
  videoType?: string;
  videoQuality?: string;
  videoFps?: string;
  videoScale?: string;
  bitRate?: string;
  videoSize?: string;
  bugReport?: string;
}

// JSONWP

export type Size = Pick<Rect, 'width' | 'height'>;

export type Position = Pick<Rect, 'x' | 'y'>;

export interface Location {
  latitude: number;
  longitude: number;
  altitude: number;
}

export interface Rotation {
  x: number;
  y: number;
  z: number;
}

// Web Authentication

export interface Credential {
  credentialId: string;
  isResidentCredential: boolean;
  rpId: string;
  privateKey: string;
  userHandle?: string;
  signCount: number;
  largeBlob?: string;
}

export interface EventHistory {
  commands: EventHistoryCommand[];
  [key: string]: any;
}

export interface EventHistoryCommand {
  cmd: string;
  startTime: number;
  endTime: number;
}
export type HTTPMethod = _Method;
export type Constructor<T = {}> = new (...args: any[]) => T;

export interface AppiumLogger {
  unwrap(): Logger;
  level: string;
  levels: string[];
  debug: (...args: any[]) => void;
  info: (...args: any[]) => void;
  warn: (...args: any[]) => void;
  error: (...args: any[]) => void;
  verbose: (...args: any[]) => void;
  silly: (...args: any[]) => void;
  http: (...args: any[]) => void;
  errorAndThrow: (...args: any[]) => never;
}


export type AppiumServer = Server & {
  close: () => Promise<void>
};

export interface TimeoutCommands {
  timeouts(
    type: string,
    ms: number,
    script: number,
    pageLoad: number,
    implicit: number,
  ): Promise<void>;
  setNewCommandTimeout(ms: number): void;
  setImplicitWait(ms: number): void;
  implicitWaitForCondition(condition: () => Promise<any>): Promise<unknown>;
  getTimeouts(): Promise<Record<string, number>>;
  implicitWaitW3C(ms: number): Promise<void>;
  implicitWaitMJSONWP(ms: number): Promise<void>;
  pageLoadTimeoutW3C(ms: number): Promise<void>;
  pageLoadTimeoutMJSONWP(ms: number): Promise<void>;
  scriptTimeoutW3C(ms: number): Promise<void>;
  scriptTimeoutMJSONWP(ms: number): Promise<void>;
  newCommandTimeout(ms: number): Promise<void>;
}

export interface EventCommands {
  logCustomEvent(vendor: string, event: string): void;
  getLogEvents(type?: string | string[]): EventHistory | Record<string, number>;
}

export interface SessionCommands {
  getSessions(): Promise<{id: string; capabilities: {}}[]>;
  getSession(): Promise<{}>;
}

export interface FindCommands {
  findElement(strategy: string, selector: string): Promise<Element>;
  findElements(strategy: string, selector: string): Promise<Element[]>;
  findElementFromElement(
    strategy: string,
    selector: string,
    elementId: string,
  ): Promise<Element>;
  findElementsFromElement(
    strategy: string,
    selector: string,
    elementId: string,
  ): Promise<Element[]>;

  findElOrEls<Mult extends boolean>(
    strategy: string,
    selector: string,
    mult: Mult,
    context?: string,
  ): Promise<Mult extends true ? Element[] : Element>;

  findElOrElsWithProcessing<Mult extends boolean>(
    strategy: string,
    selector: string,
    mult: Mult,
    context?: string,
  ): Promise<Mult extends true ? Element[] : Element>;

  getPageSource(): Promise<string>;
}

export interface LogCommands {
  getLogTypes(): Promise<string[]>;
  getLog<T>(logType: LogType<T>): Promise<any[]>;
}

export interface SettingsCommands {
  updateSettings: (settings: Record<string, any>) => Promise<void>;
  getSettings(): Promise<Record<string, any>>;
}
