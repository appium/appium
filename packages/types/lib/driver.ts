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
  ExecuteMethodMap,
} from '.';
import {ServerArgs} from './config';
import {AsyncReturnType, ConditionalPick} from 'type-fest';

export interface ITimeoutCommands {
  /**
   * Set the various timeouts associated with a session
   * @see {@link https://w3c.github.io/webdriver/#set-timeouts}
   *
   * @param type - used only for the old (JSONWP) command, the type of the timeout
   * @param ms - used only for the old (JSONWP) command, the ms for the timeout
   * @param script - the number in ms for the script timeout, used for the W3C command
   * @param pageLoad - the number in ms for the pageLoad timeout, used for the W3C command
   * @param implicit - the number in ms for the implicit wait timeout, used for the W3C command
   */
  timeouts(
    type: string,
    ms: number | string,
    script?: number,
    pageLoad?: number,
    implicit?: number | string
  ): Promise<void>;

  /**
   * Set the new command timeout
   *
   * @param ms - the timeout in ms
   */
  setNewCommandTimeout(ms: number): void;

  /**
   * Set the implicit wait timeout
   *
   * @param ms - the timeout in ms
   *
   * @deprecated Use `timeouts` instead
   */
  implicitWait(ms: number | string): Promise<void>;

  /**
   * A helper method (not a command) used to set the implicit wait value
   *
   * @param ms - the implicit wait in ms
   */
  setImplicitWait(ms: number): void;

  /**
   * Periodically retry an async function up until the currently set implicit wait timeout
   *
   * @param condition - the behaviour to retry until it returns truthy
   *
   * @returns The return value of the condition
   */
  implicitWaitForCondition(condition: () => Promise<any>): Promise<unknown>;

  /**
   * Get the current timeouts
   * @see {@link https://w3c.github.io/webdriver/#get-timeouts}
   *
   * @returns A map of timeout names to ms values
   */
  getTimeouts(): Promise<Record<string, number>>;

  /**
   * Set the implicit wait value that was sent in via the W3C protocol
   *
   * @param ms - the timeout in ms
   */
  implicitWaitW3C(ms: number): Promise<void>;

  /**
   * Set the implicit wait value that was sent in via the JSONWP
   *
   * @param ms - the timeout in ms
   * @deprecated
   */
  implicitWaitMJSONWP(ms: number): Promise<void>;

  /**
   * Set the page load timeout value that was sent in via the W3C protocol
   *
   * @param ms - the timeout in ms
   */
  pageLoadTimeoutW3C(ms: number): Promise<void>;

  /**
   * Set the page load timeout value that was sent in via the JSONWP
   *
   * @param ms - the timeout in ms
   * @deprecated
   */
  pageLoadTimeoutMJSONWP(ms: number): Promise<void>;

  /**
   * Set the script timeout value that was sent in via the W3C protocol
   *
   * @param ms - the timeout in ms
   */
  scriptTimeoutW3C(ms: number): Promise<void>;

  /**
   * Set the script timeout value that was sent in via the JSONWP
   *
   * @param ms - the timeout in ms
   * @deprecated
   */
  scriptTimeoutMJSONWP(ms: number): Promise<void>;

  /**
   * Set Appium's new command timeout
   *
   * @param ms - the timeout in ms
   */
  newCommandTimeout(ms: number): Promise<void>;

  /**
   * Get a timeout value from a number or a string
   *
   * @param ms - the timeout value as a number or a string
   *
   * @returns The timeout as a number in ms
   */
  parseTimeoutArgument(ms: number | string): number;
}

export interface IEventCommands {
  /**
   * Add a custom-named event to the Appium event log
   *
   * @param vendor - the name of the vendor or tool the event belongs to, to namespace the event
   * @param event - the name of the event itself
   */
  logCustomEvent(vendor: string, event: string): Promise<void>;

  /**
   * Get a list of events that have occurred in the current session
   *
   * @param type - filter the returned events by including one or more types
   *
   * @returns The event history for the session
   */
  getLogEvents(type?: string | string[]): Promise<EventHistory | Record<string, number>>;
}

export interface ISessionCommands {
  /**
   * Get data for all sessions running on an Appium server
   *
   * @returns A list of session data objects
   */
  getSessions(): Promise<MultiSessionData[]>;

  /**
   * Get the data for the current session
   *
   * @returns A session data object
   */
  getSession(): Promise<SingularSessionData>;
}

export interface IExecuteCommands {
  /**
   * Call an `Execute Method` by its name with the given arguments. This method will check that the
   * driver has registered the method matching the name, and send it the arguments.
   *
   * @param script - the name of the Execute Method
   * @param args - a singleton array containing an arguments object
   *
   * @returns The result of calling the Execute Method
   */
  executeMethod(script: string, args: [StringRecord] | []): Promise<any>;
}

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
  /**
   * Find a UI element given a locator strategy and a selector, erroring if it can't be found
   * @see {@link https://w3c.github.io/webdriver/#find-element}
   *
   * @param strategy - the locator strategy
   * @param selector - the selector to combine with the strategy to find the specific element
   *
   * @returns The element object encoding the element id which can be used in element-related
   * commands
   */
  findElement(strategy: string, selector: string): Promise<Element>;

  /**
   * Find a a list of all UI elements matching a given a locator strategy and a selector
   * @see {@link https://w3c.github.io/webdriver/#find-elements}
   *
   * @param strategy - the locator strategy
   * @param selector - the selector to combine with the strategy to find the specific elements
   *
   * @returns A possibly-empty list of element objects
   */
  findElements(strategy: string, selector: string): Promise<Element[]>;

  /**
   * Find a UI element given a locator strategy and a selector, erroring if it can't be found. Only
   * look for elements among the set of descendants of a given element
   * @see {@link https://w3c.github.io/webdriver/#find-element-from-element}
   *
   * @param strategy - the locator strategy
   * @param selector - the selector to combine with the strategy to find the specific element
   * @param elementId - the id of the element to use as the search basis
   *
   * @returns The element object encoding the element id which can be used in element-related
   * commands
   */
  findElementFromElement(strategy: string, selector: string, elementId: string): Promise<Element>;

  /**
   * Find a a list of all UI elements matching a given a locator strategy and a selector. Only
   * look for elements among the set of descendants of a given element
   * @see {@link https://w3c.github.io/webdriver/#find-elements-from-element}
   *
   * @param strategy - the locator strategy
   * @param selector - the selector to combine with the strategy to find the specific elements
   * @param elementId - the id of the element to use as the search basis
   *
   * @returns A possibly-empty list of element objects
   */
  findElementsFromElement(
    strategy: string,
    selector: string,
    elementId: string
  ): Promise<Element[]>;

  /**
   * Find an element from a shadow root
   * @see {@link https://w3c.github.io/webdriver/#find-element-from-shadow-root}
   * @param strategy - the locator strategy
   * @param selector - the selector to combine with the strategy to find the specific elements
   * @param shadowId - the id of the element to use as the search basis
   *
   * @returns The element inside the shadow root matching the selector
   */
  findElementFromShadowRoot?(
    strategy: string,
    selector: string,
    shadowId: string
  ): Promise<Element>;

  /**
   * Find elements from a shadow root
   * @see {@link https://w3c.github.io/webdriver/#find-element-from-shadow-root}
   * @param strategy - the locator strategy
   * @param selector - the selector to combine with the strategy to find the specific elements
   * @param shadowId - the id of the element to use as the search basis
   *
   * @returns A possibly empty list of elements inside the shadow root matching the selector
   */
  findElementsFromShadowRoot?(
    strategy: string,
    selector: string,
    shadowId: string
  ): Promise<Element[]>;

  /**
   * A helper method that returns one or more UI elements based on the search criteria
   *
   * @param strategy - the locator strategy
   * @param selector - the selector
   * @param mult - whether or not we want to find multiple elements
   * @param context - the element to use as the search context basis if desiredCapabilities
   *
   * @returns A single element or list of elements
   */
  findElOrEls<Mult extends boolean>(
    strategy: string,
    selector: string,
    mult: Mult,
    context?: Ctx
  ): Promise<Mult extends true ? Element[] : Element>;

  /**
   * This is a wrapper for {@linkcode IFindCommands.findElOrEls} that validates locator strategies
   * and implements the `appium:printPageSourceOnFindFailure` capability
   *
   * @param strategy - the locator strategy
   * @param selector - the selector
   * @param mult - whether or not we want to find multiple elements
   * @param context - the element to use as the search context basis if desiredCapabilities
   *
   * @returns A single element or list of elements
   */
  findElOrElsWithProcessing<Mult extends boolean>(
    strategy: string,
    selector: string,
    mult: Mult,
    context?: Ctx
  ): Promise<Mult extends true ? Element[] : Element>;

  /**
   * Get the current page/app source as HTML/XML
   * @see {@link https://w3c.github.io/webdriver/#get-page-source}
   *
   * @returns The UI hierarchy in a platform-appropriate format (e.g., HTML for a web page)
   */
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
  /**
   * Update the session's settings dictionary with a new settings object
   *
   * @param settings - A key-value map of setting names to values. Settings not named in the map
   * will not have their value adjusted.
   */
  updateSettings: (settings: StringRecord) => Promise<void>;

  /**
   * Get the current settings for the session
   *
   * @returns The settings object
   */
  getSettings(): Promise<StringRecord>;
}

export interface SessionHandler<
  CreateResult,
  DeleteResult,
  C extends Constraints = BaseDriverCapConstraints,
  Extra extends StringRecord | void = void
> {
  /**
   * Start a new automation session
   * @see {@link https://w3c.github.io/webdriver/#new-session}
   *
   * @remarks
   * The shape of this method is strange because it used to support both JSONWP and W3C
   * capabilities. This will likely change in the future to simplify.
   *
   * @param w3cCaps1 - the new session capabilities
   * @param w3cCaps2 - another place the new session capabilities could be sent (typically left undefined)
   * @param w3cCaps - another place the new session capabilities could be sent (typically left undefined)
   * @param driverData - a list of DriverData objects representing other sessions running for this
   * driver on the same Appium server. This information can be used to help ensure no conflict of
   * resources
   *
   * @returns The capabilities object representing the created session
   */
  createSession(
    w3cCaps1: W3CCapabilities<C, Extra>,
    w3cCaps2?: W3CCapabilities<C, Extra>,
    w3cCaps3?: W3CCapabilities<C, Extra>,
    driverData?: DriverData[]
  ): Promise<CreateResult>;

  /**
   * Stop an automation session
   * @see {@link https://w3c.github.io/webdriver/#delete-session}
   *
   * @param sessionId - the id of the session that is to be deleted
   * @param driverData - the driver data for other currently-running sessions
   */
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

export interface StartScreenRecordOptions {
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

export interface StopScreenRecordOptions {
  remotePath?: string;
  user?: string;
  pass?: string;
  method?: string;
  headers?: Record<string, string>;
  fileFieldName?: string;
  formFields: Record<string, string> | Array<[string, string]>;
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
  /**
   * The set of command line arguments set for this driver
   */
  cliArgs: CArgs;

  // The following methods are implemented by `BaseDriver`.

  /**
   * Execute a driver (WebDriver-protocol) command by its name as defined in the routes file
   *
   * @param cmd - the name of the command
   * @param args - arguments to pass to the command
   *
   * @returns The result of running the command
   */
  executeCommand(cmd: string, ...args: any[]): Promise<any>;

  /**
   * Signify to any owning processes that this driver encountered an error which should cause the
   * session to terminate immediately (for example an upstream service failed)
   *
   * @param err - the Error object which is causing the shutdown
   */
  startUnexpectedShutdown(err?: Error): Promise<void>;

  /**
   * Start the timer for the New Command Timeout, which when it runs out, will stop the current
   * session
   */
  startNewCommandTimeout(): Promise<void>;

  /**
   * Reset the current session (run the delete session and create session subroutines)
   *
   * @deprecated Use explicit session management commands instead
   */
  reset(): Promise<void>;

  /**
   * The processed capabilities used to start the session represented by the current driver instance
   */
  caps?: Capabilities<C>;

  /**
   * The original capabilities used to start the session represented by the current driver instance
   */
  originalCaps?: W3CCapabilities<C>;

  /**
   * The constraints object used to validate capabilities
   */
  desiredCapConstraints: C;

  /**
   * Validate the capabilities used to start a session
   *
   * @param caps - the capabilities
   *
   * @internal
   *
   * @returns Whether or not the capabilities are valid
   */
  validateDesiredCaps(caps: Capabilities<C>): boolean;

  /**
   * A helper function to log unrecognized capabilities to the console
   *
   * @params caps - the capabilities
   *
   * @internal
   */
  logExtraCaps(caps: Capabilities<C>): void;

  /**
   * A helper function used to assign server information to the driver instance so the driver knows
   * where the server is Running
   *
   * @param server - the server object
   * @param host - the server hostname
   * @param port - the server port
   * @param path - the server base url
   */
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

  // WebDriver spec commands

  /**
   * Navigate to a given url
   * @see {@link https://w3c.github.io/webdriver/#navigate-to}
   *
   * @param url - the url
   */
  setUrl?(url: string): Promise<void>;

  /**
   * Get the current url
   * @see {@link https://w3c.github.io/webdriver/#get-current-url}
   *
   * @returns The url
   */
  getUrl?(): Promise<string>;

  /**
   * Navigate back in the page history
   * @see {@link https://w3c.github.io/webdriver/#back}
   */
  back?(): Promise<void>;

  /**
   * Navigate forward in the page history
   * @see {@link https://w3c.github.io/webdriver/#forward}
   */
  forward?(): Promise<void>;

  /**
   * Refresh the page
   * @see {@link https://w3c.github.io/webdriver/#refresh}
   */
  refresh?(): Promise<void>;

  /**
   * Get the current page title
   * @see {@link https://w3c.github.io/webdriver/#get-title}
   *
   * @returns The title
   *
   * @example
   * ```js
   * await driver.getTitle()
   * ```
   * ```py
   * driver.title
   * ```
   * ```java
   * driver.getTitle();
   * ```
   */
  title?(): Promise<string>;

  /**
   * Get the handle (id) associated with the current browser window
   * @see {@link https://w3c.github.io/webdriver/#get-window-handle}
   *
   * @returns The handle string
   */
  getWindowHandle?(): Promise<string>;

  /**
   * Close the current browsing context (window)
   * @see {@link https://w3c.github.io/webdriver/#close-window}
   *
   * @returns An array of window handles representing currently-open windows
   */
  closeWindow?(): Promise<string[]>;

  /**
   * Switch to a specified window
   * @see {@link https://w3c.github.io/webdriver/#switch-to-window}
   *
   * @param handle - the window handle of the window to make active
   */
  setWindow?(handle: string): Promise<void>;

  /**
   * Get a set of handles representing open browser windows
   * @see {@link https://w3c.github.io/webdriver/#get-window-handles}
   *
   * @returns An array of window handles representing currently-open windows
   */
  getWindowHandles?(): Promise<string[]>;

  /**
   * Create a new browser window
   * @see {@link https://w3c.github.io/webdriver/#new-window}
   *
   * @param type - a hint to the driver whether to create a "tab" or "window"
   *
   * @returns An object containing the handle of the newly created window and its type
   */
  createNewWindow?(type?: NewWindowType): Promise<NewWindow>;

  /**
   * Switch the current browsing context to a frame
   * @see {@link https://w3c.github.io/webdriver/#switch-to-frame}
   *
   * @param id - the frame id, index, or `null` (indicating the top-level context)
   */
  setFrame?(id: null | number | string): Promise<void>;

  /**
   * Set the current browsing context to the parent of the current context
   * @see {@link https://w3c.github.io/webdriver/#switch-to-parent-frame}
   */
  switchToParentFrame?(): Promise<void>;

  /**
   * Get the size and position of the current window
   * @see {@link https://w3c.github.io/webdriver/#get-window-rect}
   *
   * @returns A `Rect` JSON object with x, y, width, and height properties
   */
  getWindowRect?(): Promise<Rect>;

  /**
   * Set the current window's size and position
   * @see {@link https://w3c.github.io/webdriver/#set-window-rect}
   *
   * @param x - the screen coordinate for the new left edge of the window
   * @param y - the screen coordinate for the new top edge of the window
   * @param width - the width in pixels to resize the window to
   * @param height - the height in pixels to resize the window to
   *
   * @returns The actual `Rect` of the window after running the command
   */
  setWindowRect?(x: number, y: number, width: number, height: number): Promise<Rect>;

  /**
   * Run the window-manager specific 'maximize' operation on the current window
   * @see {@link https://w3c.github.io/webdriver/#maximize-window}
   *
   * @returns The actual `Rect` of the window after running the command
   */
  maximizeWindow?(): Promise<Rect>;

  /**
   * Run the window-manager specific 'minimize' operation on the current window
   * @see {@link https://w3c.github.io/webdriver/#minimize-window}
   *
   * @returns The actual `Rect` of the window after running the command
   */
  minimizeWindow?(): Promise<Rect>;

  /**
   * Put the current window into full screen mode
   * @see {@link https://w3c.github.io/webdriver/#fullscreen-window}
   *
   * @returns The actual `Rect` of the window after running the command
   */
  fullScreenWindow?(): Promise<Rect>;

  /**
   * Get the active element
   * @see {@link https://w3c.github.io/webdriver/#get-active-element}
   *
   * @returns The JSON object encapsulating the active element reference
   */
  active?(): Promise<Element>;

  /**
   * Get the shadow root of an element
   * @see {@link https://w3c.github.io/webdriver/#get-element-shadow-root}
   *
   * @param elementId - the id of the element to retrieve the shadow root for
   *
   * @returns The shadow root for an element, as an element
   */
  elementShadowRoot?(elementId: string): Promise<Element>;

  /**
   * Determine if the reference element is selected or not
   * @see {@link https://w3c.github.io/webdriver/#is-element-selected}
   *
   * @param elementId - the id of the element
   *
   * @returns True if the element is selected, False otherwise
   */
  elementSelected?(elementId: string): Promise<boolean>;

  /**
   * Retrieve the value of an element's attribute
   * @see {@link https://w3c.github.io/webdriver/#get-element-attribute}
   *
   * @param name - the attribute name
   * @param elementId - the id of the element
   *
   * @returns The attribute value
   */
  getAttribute?(name: string, elementId: string): Promise<string | null>;

  /**
   * Retrieve the value of a named property of an element's JS object
   * @see {@link https://w3c.github.io/webdriver/#get-element-property}
   *
   * @param name - the object property name
   * @param elementId - the id of the element
   *
   * @returns The property value
   */
  getProperty?(name: string, elementId: string): Promise<string | null>;

  /**
   * Retrieve the value of a CSS property of an element
   * @see {@link https://w3c.github.io/webdriver/#get-element-css-value}
   *
   * @param name - the CSS property name
   * @param elementId - the id of the element
   *
   * @returns The property value
   */
  getCssProperty?(name: string, elementId: string): Promise<string>;

  /**
   * Get the text of an element as rendered
   * @see {@link https://w3c.github.io/webdriver/#get-element-text}
   *
   * @param elementId - the id of the element
   *
   * @returns The text rendered for the element
   */
  getText?(elementId: string): Promise<string>;

  /**
   * Get the tag name of an element
   * @see {@link https://w3c.github.io/webdriver/#get-element-tag-name}
   *
   * @param elementId - the id of the element
   *
   * @returns The tag name
   */
  getName?(elementId: string): Promise<string>;

  /**
   * Get the dimensions and position of an element
   * @see {@link https://w3c.github.io/webdriver/#get-element-rect}
   *
   * @param elementId - the id of the element
   *
   * @returns The Rect object containing x, y, width, and height properties
   */
  getElementRect?(elementId: string): Promise<Rect>;

  /**
   * Determine whether an element is enabled
   * @see {@link https://w3c.github.io/webdriver/#is-element-enabled}
   *
   * @param elementId - the id of the element
   *
   * @returns True if the element is enabled, False otherwise
   */
  elementEnabled?(elementId: string): Promise<boolean>;

  /**
   * Get the WAI-ARIA role of an element
   * @see {@link https://w3c.github.io/webdriver/#get-computed-role}
   *
   * @param elementId - the id of the element
   *
   * @returns The role
   */
  getComputedRole?(elementId: string): Promise<string | null>;

  /**
   * Get the accessible name/label of an element
   * @see {@link https://w3c.github.io/webdriver/#get-computed-label}
   *
   * @param elementId - the id of the element
   *
   * @returns The accessible name
   */
  getComputedLabel?(elementId: string): Promise<string | null>;

  /**
   * Determine whether an element is displayed
   * @see {@link https://w3c.github.io/webdriver/#element-displayedness}
   *
   * @param elementId - the id of the element
   *
   * @returns True if any part of the element is rendered within the viewport, False otherwise
   */
  elementDisplayed?(elementId: string): Promise<boolean>;

  /**
   * Click/tap an element
   * @see {@link https://w3c.github.io/webdriver/#element-click}
   *
   * @param elementId - the id of the element
   */
  click?(elementId: string): Promise<void>;

  /**
   * Clear the text/value of an editable element
   * @see {@link https://w3c.github.io/webdriver/#element-clear}
   *
   * @param elementId - the id of the element
   */
  clear?(elementId: string): Promise<void>;

  /**
   * Send keystrokes to an element (or otherwise set its value)
   * @see {@link https://w3c.github.io/webdriver/#element-send-keys}
   *
   * @param text - the text to send to the element
   * @param elementId - the id of the element
   */
  setValue?(text: string, elementId: string): Promise<void>;

  /**
   * Execute JavaScript (or some other kind of script) in the browser/app context
   * @see {@link https://w3c.github.io/webdriver/#execute-script}
   *
   * @param script - the string to be evaluated as the script, which will be made the body of an
   * anonymous function in the case of JS
   * @param args - the list of arguments to be applied to the script as a function
   *
   * @returns The return value of the script execution
   */
  execute?(script: string, args: unknown[]): Promise<unknown>;

  /**
   * Execute JavaScript (or some other kind of script) in the browser/app context, asynchronously
   * @see {@link https://w3c.github.io/webdriver/#execute-async-script}
   *
   * @param script - the string to be evaluated as the script, which will be made the body of an
   * anonymous function in the case of JS
   * @param args - the list of arguments to be applied to the script as a function
   *
   * @returns The promise resolution of the return value of the script execution (or an error
   * object if the promise is rejected)
   */
  executeAsync?(script: string, args: unknown[]): Promise<unknown>;

  /**
   * Get all cookies known to the browsing context
   * @see {@link https://w3c.github.io/webdriver/#get-all-cookies}
   *
   * @returns A list of serialized cookies
   */
  getCookies?(): Promise<Cookie[]>;

  /**
   * Get a cookie by name
   * @see {@link https://w3c.github.io/webdriver/#get-named-cookie}
   *
   * @param name - the name of the cookie
   *
   * @returns A serialized cookie
   */
  getCookie?(name: string): Promise<Cookie>;

  /**
   * Add a cookie to the browsing context
   * @see {@link https://w3c.github.io/webdriver/#add-cookie}
   *
   * @param cookie - the cookie data including properties like name, value, path, domain,
   * secure, httpOnly, expiry, and samesite
   */
  setCookie?(cookie: Cookie): Promise<void>;

  /**
   * Delete a named cookie
   * @see {@link https://w3c.github.io/webdriver/#delete-cookie}
   *
   * @param name - the name of the cookie to delete
   */
  deleteCookie?(name: string): Promise<void>;

  /**
   * Delete all cookies
   * @see {@link https://w3c.github.io/webdriver/#delete-all-cookies}
   */
  deleteCookies?(): Promise<void>;

  /**
   * Perform touch or keyboard actions
   * @see {@link https://w3c.github.io/webdriver/#perform-actions}
   *
   * @param actions - the action sequence
   */
  performActions?(actions: ActionSequence[]): Promise<void>;

  /**
   * Release all keys or buttons that are currently pressed
   * @see {@link https://w3c.github.io/webdriver/#release-actions}
   */
  releaseActions?(): Promise<void>;

  /**
   * Dismiss a simple dialog/alert
   * @see {@link https://w3c.github.io/webdriver/#dismiss-alert}
   */
  postDismissAlert?(): Promise<void>;

  /**
   * Accept a simple dialog/alert
   * @see {@link https://w3c.github.io/webdriver/#accept-alert}
   */
  postAcceptAlert?(): Promise<void>;

  /**
   * Get the text of the displayed alert
   * @see {@link https://w3c.github.io/webdriver/#get-alert-text}
   *
   * @returns The text of the alert
   */
  getAlertText?(): Promise<string | null>;

  /**
   * Set the text field of an alert prompt
   * @see {@link https://w3c.github.io/webdriver/#send-alert-text}
   *
   * @param text - the text to send to the prompt
   */
  setAlertText?(text: string): Promise<void>;

  /**
   * Get a screenshot of the current document as rendered
   * @see {@link https://w3c.github.io/webdriver/#take-screenshot}
   *
   * @returns A base64-encoded string representing the PNG image data
   */
  getScreenshot?(): Promise<string>;

  /**
   * Get an image of a single element as rendered on screen
   * @see {@link https://w3c.github.io/webdriver/#take-element-screenshot}
   *
   * @param elementId - the id of the element
   *
   * @returns A base64-encoded string representing the PNG image data for the element rect
   */
  getElementScreenshot?(elementId: string): Promise<string>;

  // Appium W3C WebDriver Extension

  /**
   * Shake the device
   *
   * @deprecated
   */
  mobileShake?(): Promise<void>;

  /**
   * Get the current time on the device under timeouts
   *
   * @param format - the date/time format you would like the response into
   *
   * @returns The formatted time
   */
  getDeviceTime?(format?: string): Promise<string>;

  /**
   * Lock the device, and optionally unlock the device after a certain amount of time
   *
   * @param seconds - the number of seconds after which to unlock the device. Set to zero or leave
   * empty to not unlock the device automatically
   *
   * @deprecated
   */
  lock?(seconds?: number): Promise<void>;

  /**
   * Unlock the device
   *
   * @deprecated
   */
  unlock?(): Promise<void>;

  /**
   * Determine whether the device is locked
   *
   * @returns True if the device is locked, false otherwise
   *
   * @deprecated
   */
  isLocked?(): Promise<boolean>;

  /**
   * Direct Appium to start recording the device screen
   *
   * @param options - parameters for screen recording
   *
   * @deprecated
   */
  startRecordingScreen?(options?: StartScreenRecordOptions): Promise<void>;

  /**
   * Direct Appium to stop screen recording and return the video
   *
   * @param options - parameters for stopping like video Uploading
   *
   * @returns The base64-encoded video data
   *
   * @deprecated
   */
  stopRecordingScreen?(options?: StopScreenRecordOptions): Promise<string>;

  /**
   * List the performance data types supported by this driver, which can be used in a call to get
   * the performance data by type.
   *
   * @returns The list of types
   *
   * @deprecated
   */
  getPerformanceDataTypes?(): Promise<string[]>;

  /**
   * Get the list of performance data associated with a given type
   *
   * @param packageName - the package name / id of the app to retrieve data for
   * @param dataType - the performance data type; one of those retrieved in a call to
   * getPerformanceDataTypes
   * @param dataReadTimeout - how long to wait for data before timing out
   *
   * @returns A list of performance data strings
   *
   * @deprecated
   */
  getPerformanceData?(
    packageName: string,
    dataType: string,
    dataReadTimeout?: number
  ): Promise<string[]>;

  /**
   * Press a device hardware key by its code for the default duration
   *
   * @param keycode - the keycode
   * @param metastate - the code denoting the simultaneous pressing of any meta keys (shift etc)
   * @param flags - the code denoting the combination of extra flags
   *
   * @deprecated
   */
  pressKeyCode?(keycode: number, metastate?: number, flags?: number): Promise<void>;

  /**
   * Press a device hardware key by its code for a longer duration
   *
   * @param keycode - the keycode
   * @param metastate - the code denoting the simultaneous pressing of any meta keys (shift etc)
   * @param flags - the code denoting the combination of extra flags
   *
   * @deprecated
   */
  longPressKeyCode?(keycode: number, metastate?: number, flags?: number): Promise<void>;

  /**
   * Apply a synthetic fingerprint to the fingerprint detector of the device
   *
   * @param fingerprintId - the numeric ID of the fingerprint to use
   *
   * @deprecated
   */
  fingerprint?(fingerprintId: number): Promise<void>;

  /**
   * Simulate sending an SMS message from a certain phone number to the device
   *
   * @param phoneNumber - the number to pretend the message is from
   * @param message - the SMS text
   *
   * @deprecated
   */
  sendSMS?(phoneNumber: string, message: string): Promise<void>;

  /**
   * Simulate triggering a phone call from a phone number and having the device take an action in
   * response
   *
   * @param phoneNumber - the number to pretend the call is from
   * @param action - the action to take in response (accept, reject, etc...)
   *
   * @deprecated
   */
  gsmCall?(phoneNumber: string, action: string): Promise<void>;

  /**
   * Simulate setting the GSM signal strength for a cell phone
   *
   * @param singalStrength - the strength in a driver-appropriate string
   *
   * @deprecated
   */
  gsmSignal?(signalStrength: string): Promise<void>;

  /**
   * Do something with GSM voice (unclear; this should not be implemented anywhere)
   *
   * @param state - the state
   *
   * @deprecated
   */
  gsmVoice?(state: string): Promise<void>;

  /**
   * Set the simulated power capacity of the device
   *
   * @param percent - how full the battery should become
   *
   * @deprecated
   */
  powerCapacity?(percent: number): Promise<void>;

  /**
   * Set the AC-connected power state of the device
   *
   * @param state - whether the device is connected to power or not
   *
   * @deprecated
   */
  powerAC?(state: string): Promise<void>;

  /**
   * Set the network speed of the device
   *
   * @param netspeed - the speed as a string, like '3G'
   *
   * @deprecated
   */
  networkSpeed?(netspeed: string): Promise<void>;

  /**
   * Simulate a keyevent on the device
   *
   * @param keycode - the manufacturer defined keycode
   * @param metastate - the combination of meta startUnexpectedShutdown
   *
   * @deprecated
   */
  keyevent?(keycode: string, metastate?: string): Promise<void>;

  /**
   * Construct a rotation gesture? Unclear what this command does and it does not appear to be used
   *
   * @param x - the x coordinate of the rotation center
   * @param y - the y coordinate of the rotation center
   * @param radius - the radius of the rotation circle
   * @param rotation - the rotation angle? idk
   * @param touchCount - how many fingers to rotate
   * @param elementId - if we're rotating around an element
   *
   * @deprecated Use setRotation instead
   */
  mobileRotation?(
    x: number,
    y: number,
    radius: number,
    rotation: number,
    touchCount: number,
    duration: string,
    elementId?: string
  ): Promise<void>;

  /**
   * Get the current activity name
   *
   * @returns The activity name
   *
   * @deprecated
   */
  getCurrentActivity?(): Promise<string>;

  /**
   * Get the current active app package name/id
   *
   * @returns The package name
   *
   * @deprecated
   */
  getCurrentPackage?(): Promise<string>;

  /**
   * Install an app on a device
   *
   * @param appPath - the absolute path to a local app or a URL of a downloadable app bundle
   * @param options - driver-specific install options
   */
  installApp?(appPath: string, options?: unknown): Promise<void>;

  /**
   * Launch an app
   *
   * @param appId - the package or bundle ID of the application
   * @param options - driver-specific launch options
   */
  activateApp?(appId: string, options?: unknown): Promise<void>;

  /**
   * Remove / uninstall an app
   *
   * @param appId - the package or bundle ID of the application
   * @param options - driver-specific launch options
   */
  removeApp?(appId: string, options?: unknown): Promise<void>;

  /**
   * Quit / terminate / stop a running application
   *
   * @param appId - the package or bundle ID of the application
   * @param options - driver-specific launch options
   */
  terminateApp?(appId: string, options?: unknown): Promise<void>;

  /**
   * Determine whether an app is installed
   *
   * @param appId - the package or bundle ID of the application
   */
  isAppInstalled?(appId: string): Promise<boolean>;

  /**
   * Get the running state of an app
   *
   * @param appId - the package or bundle ID of the application
   *
   * @returns A number representing the state. 0 means not installed, 1 means not running, 3 means
   * running in the background, and 4 means running in the foreground
   */
  queryAppState?(appId: string): Promise<0 | 1 | 3 | 4>;

  /**
   * Attempt to hide a virtual keyboard
   *
   * @param strategy - the driver-specific name of a hiding strategy to follow
   * @param key - the text of a key to use to hide the keyboard
   * @param keyCode - a key code to trigger to hide the keyboard
   * @param keyName - the name of a key to use to hide the keyboard
   */
  hideKeyboard?(strategy?: string, key?: string, keyCode?: string, keyName?: string): Promise<void>;

  /**
   * Determine whether the keyboard is shown
   *
   * @returns Whether the keyboard is shown
   */
  isKeyboardShown?(): Promise<boolean>;

  /**
   * Push data to a file at a remote path on the device
   *
   * @param path - the remote path on the device to create the file at
   * @param data - the base64-encoded data which will be decoded and written to `path`
   */
  pushFile?(path: string, data: string): Promise<void>;

  /**
   * Retrieve the data from a file on the device at a given path
   *
   * @param path - the remote path on the device to pull file data from
   *
   * @returns The base64-encoded file data
   */
  pullFile?(path: string): Promise<string>;

  /**
   * Retrieve the data from a folder on the device at a given path
   *
   * @param path - the remote path of a directory on the device
   *
   * @returns The base64-encoded zip file of the directory contents
   */
  pullFolder?(path: string): Promise<string>;

  /**
   * Toggle airplane/flight mode for the device
   *
   * @deprecated
   */
  toggleFlightMode?(): Promise<void>;

  /**
   * Toggle cell network data
   *
   * @deprecated
   */
  toggleData?(): Promise<void>;

  /**
   * Toggle WiFi radio status
   *
   * @deprecated
   */
  toggleWiFi?(): Promise<void>;

  /**
   * Toggle location services for the device
   *
   * @deprecated
   */
  toggleLocationServices?(): Promise<void>;

  /**
   * Open the notifications shade/screen
   *
   * @deprecated
   */
  openNotifications?(): Promise<void>;

  /**
   * Start an Android activity within an app
   *
   * @param appPackage - the app package id
   * @param appActivity - the activity name
   * @param appWaitPackage - the package id to wait for if different from the app package
   * @param appWaitActivity - the activity name to wait for being active if different from
   * appActivity
   * @param intentAction - the action for the intent to use to start the activity
   * @param intentCategory - the category for the intent
   * @param flags - the flags for the intent
   * @param optionalIntentArguments - additional arguments to be passed to launching the intent
   * @param dontStopAppOnReset - set to true to not stop the current app before launching the
   * activity
   *
   * @deprecated
   */
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

  /**
   * Get information from the system bars of a device
   *
   * @returns An array of information objects of driver-specific shape
   *
   * @deprecated
   */
  getSystemBars?(): Promise<unknown[]>;

  /**
   * Get the display's pixel density
   *
   * @returns The density
   *
   * @deprecated
   */
  getDisplayDensity?(): Promise<number>;

  /**
   * Trigger a touch/fingerprint match or match failure
   *
   * @param match - whether the match should be a success or failure
   *
   * @deprecated
   */
  touchId?(match: boolean): Promise<void>;

  /**
   * Toggle whether the device is enrolled in the touch ID program
   *
   * @param enabled - whether to enable or disable the touch ID program
   *
   * @deprecated
   */
  toggleEnrollTouchId?(enabled: boolean): Promise<void>;

  /**
   * Start the session after it has been started.
   *
   * @deprecated Don't use this, it never made sense.
   */
  launchApp?(): Promise<void>;

  /**
   * Stop the session without stopping the session
   *
   * @deprecated Don't use this, it never made sense.
   */
  closeApp?(): Promise<void>;

  /**
   * Background (close) the app either permanently or for a certain amount of time
   *
   * @param seconds - the number of seconds to background the app for, or `null` for permanently
   *
   * @deprecated
   */
  background?(seconds: null | number): Promise<void>;

  /**
   * End platform-specific code coverage tracing
   *
   * @param intent - the Android intent for the coverage activity
   * @param path - the path to place the results
   *
   * @deprecated
   */
  endCoverage?(intent: string, path: string): Promise<void>;

  /**
   * Return the language-specific strings for an app
   *
   * @param language - the language to retrieve strings for
   * @param stringFile - the path to the localized strings file if not in the default location
   *
   * @returns A record of localized keys to localized text
   *
   * @deprecated
   */
  getStrings?(language?: string, stringFile?: string): Promise<Record<string, unknown>>;

  /**
   * Set the value, but like, now? Don't use this.
   *
   * @param value - the value to set
   * @param elementId - the element to set the value of
   *
   * @deprecated
   */
  setValueImmediate?(value: string, elementId: string): Promise<void>;

  /**
   * Set the value of a text field but ensure the current value is replace and not appended
   *
   * @param value - the text to set
   * @param elementId - the element to set it in
   *
   * @deprecated
   */
  replaceValue?(value: string, elementId: string): Promise<void>;

  /**
   * Collect the response of an async script execution? It's unclear what this is for. Don't use
   * it.
   *
   * @param response - idk
   *
   * @deprecated
   */
  receiveAsyncResponse?(response: unknown): Promise<void>;

  /**
   * Set the contents of the device clipboard
   *
   * @param content - the text to set
   * @param contentType - the media type if not text
   * @param label - the label if not text
   *
   * @deprecated
   */
  setClipboard?(content: string, contentType?: string, label?: string): Promise<void>;

  /**
   * Get the contents of the device clipboard, converted into an appropriate media type
   *
   * @param contentType - the media type if not text
   *
   * @returns The text or media content (base64-encoded) of the clipboard
   *
   * @deprecated
   */
  getClipboard?(contentType?: string): Promise<string>;

  // JSONWP
  /**
   * Set the async execute script timeout
   *
   * @param ms - the timeout
   *
   * @deprecated Use the W3C timeouts command instead
   */
  asyncScriptTimeout?(ms: number): Promise<void>;

  /**
   * Get the window size
   *
   * @returns The size (width and height)
   *
   * @deprecated Use getWindowRect instead
   */
  getWindowSize?(): Promise<Size>;

  /**
   * Get the position of an element on screen
   *
   * @param elementId - the element ID
   *
   * @returns The position of the element
   *
   * @deprecated Use getElementRect instead
   */
  getLocation?(elementId: string): Promise<Position>;

  /**
   * Get the position of an element on screen within a certain other view
   *
   * @param elementId - the element ID
   *
   * @returns The position of the element
   *
   * @deprecated Use getElementRect instead
   */
  getLocationInView?(elementId: string): Promise<Position>;

  /**
   * Get the size of an element
   *
   * @param elementId - the element ID
   *
   * @returns The size of the element
   *
   * @deprecated Use getElementRect instead
   */
  getSize?(elementId: string): Promise<Size>;

  /**
   * Check whether two elements are identical
   *
   * @param elementId - the first element's ID
   * @param otherElementId - the second element's ID
   *
   * @returns True if the elements are equal, false otherwise
   *
   * @deprecated
   */
  equalsElement?(elementId: string, otherElementId: string): Promise<boolean>;

  /**
   * Submit the form an element is in
   *
   * @param elementId - the element ID
   *
   * @deprecated
   */
  submit?(elementId: string): Promise<void>;

  /**
   * Send keys to the app
   *
   * @param value: the array of keys to send
   *
   * @deprecated Use the W3C send keys method instead
   */
  keys?(value: string[]): Promise<void>;

  /**
   * Get the list of IME engines
   *
   * @returns The list of IME engines
   *
   * @deprecated
   */
  availableIMEEngines?(): Promise<string[]>;

  /**
   * Get the active IME engine
   *
   * @returns The name of the active engine
   *
   * @deprecated
   */
  getActiveIMEEngine?(): Promise<string>;

  /**
   * Determine whether an IME is active
   *
   * @returns True if the IME is activated
   *
   * @deprecated
   */
  isIMEActivated?(): Promise<boolean>;

  /**
   * Deactivate an IME engine
   *
   * @deprecated
   */
  deactivateIMEEngine?(): Promise<void>;

  /**
   * Activate an IME engine
   *
   * @param engine - the name of the engine
   *
   * @deprecated
   */
  activateIMEEngine?(engine: string): Promise<void>;

  /**
   * Get the device orientation
   *
   * @returns The orientation string
   */
  getOrientation?(): Promise<string>;

  /**
   * Set the device orientation
   *
   * @param orientation - the orientation string
   */
  setOrientation?(orientation: string): Promise<void>;

  /**
   * Move the mouse pointer to a particular screen location
   *
   * @param element - the element ID if the move is relative to an element
   * @param xOffset - the x offset
   * @param yOffset - the y offset
   *
   * @deprecated Use the Actions API instead
   */
  moveTo?(element?: null | string, xOffset?: number, yOffset?: number): Promise<void>;

  /**
   * Trigger a mouse button down
   *
   * @param button - the button ID
   *
   * @deprecated Use the Actions API instead
   */
  buttonDown?(button?: number): Promise<void>;

  /**
   * Trigger a mouse button up
   *
   * @param button - the button ID
   *
   * @deprecated Use the Actions API instead
   */
  buttonUp?(button?: number): Promise<void>;

  /**
   * Click the current mouse location
   *
   * @param button - the button ID
   *
   * @deprecated Use the Actions API instead
   */
  clickCurrent?(button?: number): Promise<void>;

  /**
   * Double-click the current mouse location
   *
   * @deprecated Use the Actions API instead
   */
  doubleClick?(): Promise<void>;

  /**
   * Perform a touch down event at the location specified
   *
   * @param x - the x coordinate
   * @param y - the y coordinate
   *
   * @deprecated Use the Actions API instead
   */
  touchDown?(x: number, y: number): Promise<void>;

  /**
   * Perform a touch up event at the location specified
   *
   * @param x - the x coordinate
   * @param y - the y coordinate
   *
   * @deprecated Use the Actions API instead
   */
  touchUp?(x: number, y: number): Promise<void>;

  /**
   * Perform a touch move event at the location specified
   *
   * @param x - the x coordinate
   * @param y - the y coordinate
   *
   * @deprecated Use the Actions API instead
   */
  touchMove?(x: number, y: number): Promise<void>;

  /**
   * Perform a long touch down event at the location specified
   *
   * @param elementId - the id of the element to long touch
   *
   * @deprecated Use the Actions API instead
   */
  touchLongClick?(elementId: string): Promise<void>;

  /**
   * Perform a flick event at the location specified
   *
   * @param element - the element to make coordinates relative to
   * @param xSpeed - the horizontal flick speed (in driver-specific units)
   * @param ySpeed - the vertical flick speed (in driver-specific units)
   * @param xOffset - the x coordinate
   * @param yOffset - the y coordinate
   * @param speed - the speed (unclear how this relates to xSpeed and ySpeed)
   *
   * @deprecated Use the Actions API instead
   */
  flick?(
    element?: string,
    xSpeed?: number,
    ySpeed?: number,
    xOffset?: number,
    yOffset?: number,
    speed?: number
  ): Promise<void>;

  /**
   * Get the virtual or real geographical location of a device
   *
   * @returns The location
   */
  getGeoLocation?(): Promise<Location>;

  /**
   * Set the virtual geographical location of a device
   *
   * @param location - the location including latitude and longitude
   */
  setGeoLocation?(location: Partial<Location>): Promise<void>;

  // MJSONWIRE

  /**
   * Get the currently active context
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts}
   *
   * @returns The context name
   */
  getCurrentContext?(): Promise<string | null>;

  /**
   * Switch to a context by name
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts}
   *
   * @param name - the context name
   */
  setContext?(name: string): Promise<void>;

  /**
   * Get the list of available contexts
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#webviews-and-other-contexts}
   *
   * @returns The list of context names
   */
  getContexts?(): Promise<string[]>;

  /**
   * Get the index of an element on the page
   *
   * @param elementId - the element id
   *
   * @returns The page index
   *
   * @deprecated
   */
  getPageIndex?(elementId: string): Promise<string>;

  /**
   * Get the network connection state of a device
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#device-modes}
   *
   * @returns A number which is a bitmask representing categories like Data, Wifi, and Airplane
   * mode status
   */
  getNetworkConnection?(): Promise<number>;

  /**
   * Set the network connection of the device
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#device-modes}
   *
   * @param type - the bitmask representing network state
   */
  setNetworkConnection?(type: number): Promise<void>;

  /**
   * Perform a set of touch actions
   *
   * @param actions - the old MJSONWP style touch action objects
   *
   * @deprecated Use the W3C Actions API instead
   */
  performTouch?(actions: unknown): Promise<void>;

  /**
   * Perform a set of touch actions
   *
   * @param actions - the old MJSONWP style touch action objects
   * @param elementId - the id of an element if actions are restricted to one element
   *
   * @deprecated Use the W3C Actions API instead
   */
  performMultiAction?(actions: unknown, elementId: string): Promise<void>;

  /**
   * Get the current rotation state of the device
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#device-rotation}
   *
   * @returns The Rotation object consisting of x, y, and z rotation values (0 <= n <= 360)
   */
  getRotation?(): Promise<Rotation>;

  /**
   * Set the device rotation state
   * @see {@link https://github.com/SeleniumHQ/mobile-spec/blob/master/spec-draft.md#device-rotation}
   *
   * @param x - the degree to which the device is rotated around the x axis (0 <= x <= 360)
   * @param y - the degree to which the device is rotated around the y axis (0 <= y <= 360)
   * @param z - the degree to which the device is rotated around the z axis (0 <= z <= 360)
   */
  setRotation?(x: number, y: number, z: number): Promise<void>;

  // Chromium DevTools

  /**
   * Execute a devtools command
   *
   * @param cmd - the command
   * @param params - any command-specific command parameters
   *
   * @returns The result of the command execution
   */
  executeCdp?(cmd: string, params: unknown): Promise<unknown>;

  // Web Authentication

  /**
   * Add a virtual authenticator to a browser
   * @see {@link https://www.w3.org/TR/webauthn-2/#sctn-automation-add-virtual-authenticator}
   *
   * @param protocol  - the protocol
   * @param transport - a valid AuthenticatorTransport value
   * @param hasResidentKey - whether there is a resident key
   * @param hasUserVerification - whether the authenticator has user verification
   * @param isUserConsenting - whether it is a user consenting authenticator
   * @param isUserVerified - whether the user is verified
   *
   * @returns The authenticator ID
   */
  addVirtualAuthenticator?(
    protocol: 'ctap/u2f' | 'ctap2' | 'ctap2_1',
    transport: string,
    hasResidentKey?: boolean,
    hasUserVerification?: boolean,
    isUserConsenting?: boolean,
    isUserVerified?: boolean
  ): Promise<string>;

  /**
   * Remove a virtual authenticator
   * @see {@link https://www.w3.org/TR/webauthn-2/#sctn-automation-remove-virtual-authenticator}
   *
   * @param authenticatorId - the ID returned in the call to add the authenticator
   */
  removeVirtualAuthenticator?(authenticatorId: string): Promise<void>;

  /**
   * Inject a public key credential source into a virtual authenticator
   * @see {@link https://www.w3.org/TR/webauthn-2/#sctn-automation-add-credential}
   *
   * @param credentialId - the base64 encoded credential ID
   * @param isResidentCredential - if true, a client-side credential, otherwise a server-side
   * credential
   * @param rpId - the relying party ID the credential is scoped to
   * @param privateKey - the base64 encoded private key package
   * @param userHandle - the base64 encoded user handle
   * @param signCount - the initial value for a signature counter
   */
  addAuthCredential?(
    credentialId: string,
    isResidentCredential: boolean,
    rpId: string,
    privateKey: string,
    userHandle: string,
    signCount: number,
    authenticatorId: string
  ): Promise<void>;

  /**
   * Get the list of public key credential sources
   * @see {@link https://www.w3.org/TR/webauthn-2/#sctn-automation-get-credentials}
   *
   * @returns The list of Credentials
   */
  getAuthCredential?(): Promise<Credential[]>;

  /**
   * Remove all auth credentials
   * @see {@link https://www.w3.org/TR/webauthn-2/#sctn-automation-remove-all-credentials}
   */
  removeAllAuthCredentials?(): Promise<void>;

  /**
   * Remove a specific auth credential
   *
   * @param credentialId - the credential ID
   * @param authenticatorId - the authenticator ID
   */
  removeAuthCredential?(credentialId: string, authenticatorId: string): Promise<void>;

  /**
   * Set the isUserVerified property of an authenticator
   * @see {@link https://www.w3.org/TR/webauthn-2/#sctn-automation-set-user-verified}
   *
   * @param isUserVerified - the value of the isUserVerified property
   * @param authenticatorId - the authenticator id
   */
  setUserAuthVerified?(isUserVerified: boolean, authenticatorId: string): Promise<void>;

  /**
   * Proxy a command to a connected WebDriver server
   *
   * @typeParam T - the type of the return value
   * @param url - the incoming URL
   * @param method - the incoming HTTP method
   * @param body - the incoming HTTP body
   *
   * @returns The return value of the proxied command
   */
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
