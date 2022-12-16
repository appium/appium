import type {EventEmitter} from 'events';
import {Element, ActionSequence} from './action';
import {
  HTTPMethod,
  AppiumServer,
  UpdateServerCallback,
  Class,
  MethodMap,
  AppiumLogger,
  StringRecord,
  ConstraintsToCaps,
  BaseDriverCapConstraints,
  W3CCapabilities,
  Capabilities,
} from '.';
import {ServerArgs} from './config';
import {AsyncReturnType, ConditionalPick} from 'type-fest';

export interface ITimeoutCommands {
  timeouts(
    type: string,
    ms: number | string,
    script?: number,
    pageLoad?: number,
    implicit?: number | string
  ): Promise<void>;
  setNewCommandTimeout(ms: number): void;
  implicitWait(ms: number | string): Promise<void>;
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
  parseTimeoutArgument(ms: number | string): number;
}

export interface IEventCommands {
  logCustomEvent(vendor: string, event: string): Promise<void>;
  getLogEvents(type?: string | string[]): Promise<EventHistory | Record<string, number>>;
}

export interface ISessionCommands {
  getSessions(): Promise<MultiSessionData[]>;
  getSession(): Promise<SingularSessionData>;
}

export interface IExecuteCommands {
  executeMethod(script: string, args: [StringRecord] | []): Promise<any>;
}

export interface ExecuteMethodDef<D> {
  command: keyof ConditionalPick<Required<D>, DriverCommand>;
  params?: {
    required?: ReadonlyArray<string>;
    optional?: ReadonlyArray<string>;
  };
}
export type ExecuteMethodMap<D> = Readonly<Record<string, Readonly<ExecuteMethodDef<D>>>>;
export interface MultiSessionData<
  C extends Constraints = BaseDriverCapConstraints,
  Extra extends StringRecord | void = void
> {
  id: string;
  capabilities: Capabilities<C, Extra>;
}

export type SingularSessionData<
  C extends Constraints = BaseDriverCapConstraints,
  Extra extends StringRecord | void = void
> = Capabilities<C, Extra> & {events?: EventHistory; error?: string};

export interface IFindCommands<Ctx = any> {
  findElement(strategy: string, selector: string): Promise<Element>;
  findElements(strategy: string, selector: string): Promise<Element[]>;
  findElementFromElement(strategy: string, selector: string, elementId: string): Promise<Element>;
  findElementsFromElement(
    strategy: string,
    selector: string,
    elementId: string
  ): Promise<Element[]>;

  findElOrEls<Mult extends boolean>(
    strategy: string,
    selector: string,
    mult: Mult,
    context?: Ctx
  ): Promise<Mult extends true ? Element[] : Element>;

  findElOrElsWithProcessing<Mult extends boolean>(
    strategy: string,
    selector: string,
    mult: Mult,
    context?: Ctx
  ): Promise<Mult extends true ? Element[] : Element>;

  getPageSource(): Promise<string>;
}

export interface ILogCommands<C extends Constraints> {
  /**
   * Definition of the available log types
   */
  supportedLogTypes: Readonly<LogDefRecord<C>>;

  /**
   * Get available log types as a list of strings
   */
  getLogTypes(): Promise<(keyof ILogCommands<C>['supportedLogTypes'])[]>;

  /**
   * Get the log for a given log type.
   *
   * @param logType - Name/key of log type as defined in {@linkcode ILogCommands.supportedLogTypes}.
   */
  getLog(
    logType: keyof ILogCommands<C>['supportedLogTypes']
  ): Promise<
    AsyncReturnType<
      ILogCommands<C>['supportedLogTypes'][keyof ILogCommands<C>['supportedLogTypes']]['getter']
    >
  >;
}

/**
 * A record of {@linkcode LogDef} objects, keyed by the log type name.
 * Used in {@linkcode ILogCommands.supportedLogTypes}
 */
export type LogDefRecord<C extends Constraints> = Record<string, LogDef<C>>;

/**
 * A definition of a log type
 */
export interface LogDef<C extends Constraints, T = unknown> {
  /**
   * Description of the log type.
   *
   * The only place this is used is in error messages if the client provides an invalid log type
   * via {@linkcode ILogCommands.getLog}.
   */
  description: string;
  /**
   * Returns all the log data for the given type
   *
   * This implementation *should* drain, truncate or otherwise reset the log buffer.
   */
  getter: (driver: Driver<C>) => Promise<T[]>;
}

export interface ISettingsCommands {
  updateSettings: (settings: StringRecord) => Promise<void>;
  getSettings(): Promise<StringRecord>;
}

export interface SessionHandler<
  CreateResult,
  DeleteResult,
  C extends Constraints = BaseDriverCapConstraints,
  Extra extends StringRecord | void = void
> {
  createSession(
    w3cCaps1: W3CCapabilities<C, Extra>,
    w3cCaps2?: W3CCapabilities<C, Extra>,
    w3cCaps?: W3CCapabilities<C, Extra>,
    driverData?: DriverData[]
  ): Promise<CreateResult>;

  deleteSession(sessionId?: string, driverData?: DriverData[]): Promise<DeleteResult>;
}

/**
 * Custom session data for a driver.
 */
export type DriverData = Record<string, unknown>;

/**
 * Extensions can define new methods for the Appium server to map to command names, of the same
 * format as used in Appium's `routes.js`.
 *
 *
 * @example
 * {
 *   '/session/:sessionId/new_method': {
 *     GET: {command: 'getNewThing'},
 *     POST: {command: 'setNewThing', payloadParams: {required: ['someParam']}}
 *   }
 * }
 */
export interface Constraint {
  readonly presence?: boolean | Readonly<{allowEmpty: boolean}>;
  readonly isString?: boolean;
  readonly isNumber?: boolean;
  readonly isBoolean?: boolean;
  readonly isObject?: boolean;
  readonly isArray?: boolean;
  readonly deprecated?: boolean;
  readonly inclusion?: Readonly<[any, ...any[]]>;
  readonly inclusionCaseInsensitive?: Readonly<[any, ...any[]]>;
}
export type Constraints = Readonly<Record<string, Constraint>>;

export interface DriverHelpers<C extends Constraints> {
  configureApp: (app: string, supportedAppExtensions: string[]) => Promise<string>;
  isPackageOrBundle: (app: string) => boolean;
  duplicateKeys: <T>(input: T, firstKey: string, secondKey: string) => T;
  parseCapsArray: (cap: string | string[]) => string[];
  generateDriverLogPrefix: (obj: Core<C>, sessionId?: string) => string;
}

export type SettingsUpdateListener<T extends Record<string, unknown> = Record<string, unknown>> = (
  prop: keyof T,
  newValue: unknown,
  curValue: unknown
) => Promise<void>;

export interface DeviceSettings<T = any> {
  update(newSettings: Record<string, T>): Promise<void>;
  getSettings(): Record<string, T>;
}

// WebDriver

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export type NewWindowType = 'tab' | 'window';

export interface NewWindow {
  handle: string;
  type: NewWindowType;
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
  altitude?: number;
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

/**
 * Methods and properties which both `AppiumDriver` and `BaseDriver` inherit.
 *
 * This should not be used directly by external code.
 */
export interface Core<C extends Constraints = BaseDriverCapConstraints> {
  shouldValidateCaps: boolean;
  sessionId: string | null;
  opts: DriverOpts<C>;
  initialOpts: ServerArgs;
  protocol?: string;
  helpers: DriverHelpers<C>;
  basePath: string;
  relaxedSecurityEnabled: boolean;
  allowInsecure: string[];
  denyInsecure: string[];
  newCommandTimeoutMs: number;
  implicitWaitMs: number;
  locatorStrategies: string[];
  webLocatorStrategies: string[];
  eventEmitter: EventEmitter;
  settings: DeviceSettings;
  log: AppiumLogger;
  driverData?: DriverData;
  isCommandsQueueEnabled: boolean;
  eventHistory: EventHistory;
  onUnexpectedShutdown(handler: () => any): void;
  getStatus(): Promise<any>;
  sessionExists(sessionId: string): boolean;
  isW3CProtocol(): boolean;
  isMjsonwpProtocol(): boolean;
  isFeatureEnabled(name: string): boolean;
  assertFeatureEnabled(name: string): void;
  validateLocatorStrategy(strategy: string, webContext?: boolean): void;
  proxyActive(sessionId?: string): boolean;
  getProxyAvoidList(sessionId?: string): RouteMatcher[];
  canProxy(sessionId?: string): boolean;
  proxyRouteIsAvoided(sessionId: string, method: string, url: string): boolean;
  addManagedDriver(driver: Driver): void;
  getManagedDrivers(): Driver[];
  clearNewCommandTimeout(): Promise<void>;
  logEvent(eventName: string): void;
  driverForSession(sessionId: string): Core<C> | null;
}

/**
 * `BaseDriver` implements this.  It contains default behavior;
 * external drivers are expected to implement {@linkcode ExternalDriver} instead.
 *
 * `C` should be the constraints of the driver.
 * `CArgs` would be the shape of `cliArgs`.
 * `Ctx` would be the type of the element context (e.g., string, dictionary of some sort, etc.)
 */
export interface Driver<
  C extends Constraints = BaseDriverCapConstraints,
  CArgs extends StringRecord = StringRecord,
  Ctx = any
> extends ISessionCommands,
    ILogCommands<C>,
    IFindCommands<Ctx>,
    ISettingsCommands,
    ITimeoutCommands,
    IEventCommands,
    IExecuteCommands,
    SessionHandler<[string, any], void, C>,
    Core {
  cliArgs: CArgs;
  // The following methods are implemented by `BaseDriver`.
  executeCommand(cmd: string, ...args: any[]): Promise<any>;
  startUnexpectedShutdown(err?: Error): Promise<void>;
  startNewCommandTimeout(): Promise<void>;
  reset(): Promise<void>;
  caps?: Capabilities<C>;
  originalCaps?: W3CCapabilities<C>;
  desiredCapConstraints: C;
  validateDesiredCaps(caps: Capabilities<C>): boolean;
  logExtraCaps(caps: Capabilities<C>): void;
  assignServer?(server: AppiumServer, host: string, port: number, path: string): void;
}

/**
 * External drivers must subclass `BaseDriver`, and can implement any of these methods.
 * None of these are implemented within Appium itself.
 */
export interface ExternalDriver<C extends Constraints = BaseDriverCapConstraints>
  extends Driver<C> {
  // The following properties are assigned by appium */
  server?: AppiumServer;
  serverHost?: string;
  serverPort?: number;
  serverPath?: string;

  // WebDriver
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
  setWindowRect?(x: number, y: number, width: number, height: number): Promise<Rect>;
  maximizeWindow?(): Promise<Rect>;
  minimizeWindow?(): Promise<Rect>;
  fullScreenWindow?(): Promise<Rect>;
  createNewWindow?(type?: NewWindowType): Promise<NewWindow>;
  active?(): Promise<Element>;
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
  execute?(script: string, args: unknown[]): Promise<unknown>;
  executeAsync?(script: string, args: unknown[]): Promise<unknown>;
  getCookies?(): Promise<Cookie[]>;
  getCookie?(name: string): Promise<Cookie>;
  setCookie?(cookie: Cookie): Promise<void>;
  deleteCookie?(name: string): Promise<void>;
  deleteCookies?(): Promise<void>;
  performActions?(actions: ActionSequence[]): Promise<void>;
  releaseActions?(): Promise<void>;
  postDismissAlert?(): Promise<void>;
  postAcceptAlert?(): Promise<void>;
  getAlertText?(): Promise<string | null>;
  setAlertText?(text: string): Promise<void>;
  getScreenshot?(): Promise<string>;
  getElementScreenshot?(elementId: string): Promise<string>;
  getComputedRole?(elementId: string): Promise<string | null>;
  getComputedLabel?(elementId: string): Promise<string | null>;

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
    dataReadTimeout?: number
  ): Promise<string[]>;
  pressKeyCode?(keycode: number, metastate?: number, flags?: number): Promise<void>;
  longPressKeyCode?(keycode: number, metastate?: number, flags?: number): Promise<void>;
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
    elementId?: string
  ): Promise<void>;
  getCurrentActivity?(): Promise<string>;
  getCurrentPackage?(): Promise<string>;
  installApp?(appPath: string, options?: unknown): Promise<void>;
  activateApp?(appId: string, options?: unknown): Promise<void>;
  removeApp?(appId: string, options?: unknown): Promise<void>;
  terminateApp?(appId: string, options?: unknown): Promise<void>;
  isAppInstalled?(appId: string): Promise<boolean>;
  queryAppState?(appId: string): Promise<number>;
  hideKeyboard?(strategy?: string, key?: string, keyCode?: string, keyName?: string): Promise<void>;
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
    dontStopAppOnReset?: boolean
  ): Promise<void>;
  getSystemBars?(): Promise<unknown[]>;
  getDisplayDensity?(): Promise<number>;
  touchId?(match: boolean): Promise<void>;
  toggleEnrollTouchId?(enabled: boolean): Promise<void>;
  launchApp?(): Promise<void>;
  closeApp?(): Promise<void>;
  background?(seconds: null | number): Promise<void>;
  endCoverage?(intent: string, path: string): Promise<void>;
  getStrings?(language?: string, stringFile?: string): Promise<Record<string, unknown>>;
  setValueImmediate?(value: string, elementId: string): Promise<void>;
  replaceValue?(value: string, elementId: string): Promise<void>;
  receiveAsyncResponse?(response: unknown): Promise<void>;
  setClipboard?(content: string, contentType?: string, label?: string): Promise<void>;
  getClipboard?(contentType?: string): Promise<string>;

  // JSONWP
  asyncScriptTimeout?(ms: number): Promise<void>;
  getWindowSize?(): Promise<Size>;
  getLocation?(elementId: string): Promise<Position>;
  getLocationInView?(elementId: string): Promise<Position>;
  getSize?(elementId: string): Promise<Size>;
  elementShadowRoot?(elementId: string): Promise<Element>;
  findElementFromShadowRoot?(
    strategy: string,
    selector: string,
    shadowId: string
  ): Promise<Element>;
  findElementsFromShadowRoot?(
    strategy: string,
    selector: string,
    shadowId: string
  ): Promise<Element[]>;
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
  moveTo?(element?: null | string, xOffset?: number, yOffset?: number): Promise<void>;
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
    speed?: number
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
    isUserVerified?: boolean
  ): Promise<void>;
  removeVirtualAuthenticator?(): Promise<void>;
  addAuthCredential?(
    credentialId: string,
    isResidentCredential: boolean,
    rpId: string,
    privateKey: string,
    userHandle?: string,
    signCount?: number
  ): Promise<void>;
  getAuthCredential?(): Promise<Credential[]>;
  removeAllAuthCredentials?(): Promise<void>;
  removeAuthCredential?(): Promise<void>;
  setUserAuthVerified?(isUserVerified: boolean): Promise<void>;
  proxyCommand?<T = any>(url: string, method: HTTPMethod, body?: string): Promise<T>;
}

/**
 * Static members of a {@linkcode DriverClass}.
 *
 * This is likely unusable by external consumers, but YMMV!
 */
export interface DriverStatic<D extends Driver> {
  baseVersion: string;
  updateServer?: UpdateServerCallback;
  newMethodMap?: MethodMap<D>;
  executeMethodMap?: ExecuteMethodMap<D>;
}

/**
 * Represents a driver class, which is used internally by Appium.
 *
 * This is likely unusable by external consumers, but YMMV!
 */
export type DriverClass<D extends Driver = ExternalDriver> = Class<
  D,
  DriverStatic<D>,
  [] | [Partial<ServerArgs>] | [Partial<ServerArgs>, boolean]
>;

export interface ExtraDriverOpts {
  fastReset?: boolean;
  skipUninstall?: boolean;
}
/**
 * Options as passed into a driver constructor, which is just a union of {@linkcode ServerArgs} and {@linkcode Capabilities}.
 *
 * The combination happens within Appium prior to calling the constructor.
 */
export type DriverOpts<C extends Constraints = BaseDriverCapConstraints> = ServerArgs &
  ExtraDriverOpts &
  Partial<ConstraintsToCaps<C>>;

export type DriverCommand<TArgs = any, TReturn = unknown> = (...args: TArgs[]) => Promise<TReturn>;

export type DriverCommands<TArgs = any, TReturn = unknown> = Record<
  string,
  DriverCommand<TArgs, TReturn>
>;

/**
 * Tuple of an HTTP method with a regex matching a request path
 */
export type RouteMatcher = [HTTPMethod, RegExp];
