import type {DriverCaps, W3CDriverCaps} from '../capabilities';
import type {Constraints} from '../constraints';
import type {Element, StringRecord} from '../util';

export interface IBidiCommands {
  bidiSubscribe(events: string[], contexts: string[]): Promise<void>;
  bidiUnsubscribe(events: string[], contexts: string[]): Promise<void>;
  bidiStatus(): Promise<DriverStatus>;
}

export interface DriverStatus {
  ready: boolean,
  message: string,
  [key: string]: any;
}

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
    type?: string,
    ms?: number | string,
    script?: number,
    pageLoad?: number,
    implicit?: number | string,
  ): Promise<void>;

  /**
   * Set the new command timeout
   *
   * @param ms - the timeout in ms
   */
  setNewCommandTimeout(ms: number): void;

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
  implicitWaitForCondition(condition: (...args: any[]) => Promise<any>): Promise<unknown>;

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
   * Set the page load timeout value that was sent in via the W3C protocol
   *
   * @param ms - the timeout in ms
   */
  pageLoadTimeoutW3C(ms: number): Promise<void>;

  /**
   * Set the script timeout value that was sent in via the W3C protocol
   *
   * @param ms - the timeout in ms
   */
  scriptTimeoutW3C(ms: number): Promise<void>;

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

export interface EventHistory {
  commands: EventHistoryCommand[];
  [key: string]: any;
}

export interface EventHistoryCommand {
  cmd: string;
  startTime: number;
  endTime: number;
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
  executeMethod<
    TArgs extends readonly any[] | readonly [StringRecord<unknown>] = unknown[],
    TReturn = unknown,
  >(
    script: string,
    args: TArgs,
  ): Promise<TReturn>;
}

export interface IFindCommands {
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
    elementId: string,
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
    shadowId: string,
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
    shadowId: string,
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
  findElOrEls(strategy: string, selector: string, mult: true, context?: any): Promise<Element[]>;
  findElOrEls(strategy: string, selector: string, mult: false, context?: any): Promise<Element>;

  /**
   * This is a wrapper for {@linkcode findElOrEls} that validates locator strategies
   * and implements the `appium:printPageSourceOnFindFailure` capability
   *
   * @param strategy - the locator strategy
   * @param selector - the selector
   * @param mult - whether or not we want to find multiple elements
   * @param context - the element to use as the search context basis if desiredCapabilities
   *
   * @returns A single element or list of elements
   */
  findElOrElsWithProcessing(
    strategy: string,
    selector: string,
    mult: true,
    context?: any,
  ): Promise<Element[]>;
  findElOrElsWithProcessing(
    strategy: string,
    selector: string,
    mult: false,
    context?: any,
  ): Promise<Element>;

  /**
   * Get the current page/app source as HTML/XML
   * @see {@link https://w3c.github.io/webdriver/#get-page-source}
   *
   * @returns The UI hierarchy in a platform-appropriate format (e.g., HTML for a web page)
   */
  getPageSource(): Promise<string>;
}

export interface ILogCommands {
  /**
   * Definition of the available log types
   */
  supportedLogTypes: Readonly<LogDefRecord>;

  /**
   * Get available log types as a list of strings
   */
  getLogTypes(): Promise<string[]>;

  /**
   * Get the log for a given log type.
   *
   * @param logType - Name/key of log type as defined in {@linkcode ILogCommands.supportedLogTypes}.
   */
  getLog(logType: string): Promise<any>;
}

/**
 * A record of {@linkcode LogDef} objects, keyed by the log type name.
 * Used in {@linkcode ILogCommands.supportedLogTypes}
 */
export type LogDefRecord = Record<string, LogDef>;

/**
 * A definition of a log type
 */
export interface LogDef {
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
  getter: (driver: any) => Promise<unknown> | unknown;
}

export interface ISettingsCommands<T extends object = object> {
  /**
   * Update the session's settings dictionary with a new settings object
   *
   * @param settings - A key-value map of setting names to values. Settings not named in the map
   * will not have their value adjusted.
   */
  updateSettings: (settings: T) => Promise<void>;

  /**
   * Get the current settings for the session
   *
   * @returns The settings object
   */
  getSettings(): Promise<T>;
}

/**
 * An interface which creates and deletes sessions.
 */
export interface ISessionHandler<
  C extends Constraints = Constraints,
  CreateResult = DefaultCreateSessionResult<C>,
  DeleteResult = DefaultDeleteSessionResult,
  SessionData extends StringRecord = StringRecord,
> {
  /**
   * Start a new automation session
   * @see {@link https://w3c.github.io/webdriver/#new-session}
   *
   * @privateRemarks
   * The shape of this method is strange because it used to support both JSONWP and W3C
   * capabilities. This will likely change in the future to simplify.
   *
   * @param w3cCaps1 - the new session capabilities
   * @param w3cCaps2 - another place the new session capabilities could be sent (typically left undefined)
   * @param w3cCaps3 - another place the new session capabilities could be sent (typically left undefined)
   * @param driverData - a list of DriverData objects representing other sessions running for this
   * driver on the same Appium server. This information can be used to help ensure no conflict of
   * resources
   *
   * @returns The capabilities object representing the created session
   */
  createSession(
    w3cCaps1: W3CDriverCaps<C>,
    w3cCaps2?: W3CDriverCaps<C>,
    w3cCaps3?: W3CDriverCaps<C>,
    driverData?: DriverData[],
  ): Promise<CreateResult>;

  /**
   * Stop an automation session
   * @see {@link https://w3c.github.io/webdriver/#delete-session}
   *
   * @param sessionId - the id of the session that is to be deleted
   * @param driverData - the driver data for other currently-running sessions
   */
  deleteSession(sessionId?: string, driverData?: DriverData[]): Promise<DeleteResult | void>;

  /**
   * Get the data for the current session
   *
   * @returns A session data object
   */
  getSession(): Promise<SingularSessionData<C, SessionData>>;

  /**
   * Get the capabilities of the current session
   *
   * @returns A session capabilities object
   */
  getAppiumSessionCapabilities(): Promise<SessionCapabilities<C>>;
}

/**
 * @see {@linkcode ISessionHandler}
 */
export type DefaultCreateSessionResult<C extends Constraints> = [
  sessionId: string,
  capabilities: DriverCaps<C>,
];

/**
 * @see {@linkcode ISessionHandler}
 */
export type DefaultDeleteSessionResult = void;

/**
 * Custom session data for a driver.
 */
export type DriverData = Record<string, unknown>;

/**
 * Data returned by {@linkcode ISessionHandler.getSession}.
 *
 * @typeParam C - The driver's capability constraints
 * @typeParam T - Any extra data the driver stuffs in here
 * @privateRemarks The content of this object looks implementation-specific and in practice is not well-defined.  It's _possible_ to fully type this in the future.
 */
export type SingularSessionData<
  C extends Constraints = Constraints,
  T extends StringRecord = StringRecord,
> = DriverCaps<C> & {
  events?: EventHistory;
  error?: string;
} & T;

/**
 * Data returned by `AppiumDriver.getAppiumSessions`
 *
 * @typeParam C - The driver's constraints
 */
export interface TimestampedMultiSessionData<C extends Constraints = Constraints> {
  id: string;
  created: number; // Unix timestamp in milliseconds
  capabilities: DriverCaps<C>;
}

/**
 * Data returned by {@linkcode ISessionCommands.getAppiumSessionCapabilities}.
 *
 * @typeParam C - The driver's constraints
 * @typeParam T - Any extra data the driver stuffs in here
 */
export type SessionCapabilities<
  C extends Constraints = Constraints,
  T extends StringRecord = StringRecord,
> = {
  capabilities: DriverCaps<C>;
} & T;

/**
 * Interface for all commands expected to be implemented by BaseDriver.
 */
export type IImplementedCommands<
  C extends Constraints = Constraints,
  Settings extends StringRecord = StringRecord,
  CreateResult = DefaultCreateSessionResult<C>,
  DeleteResult = DefaultDeleteSessionResult,
  SessionData extends StringRecord = StringRecord,
> = IBidiCommands
  & ILogCommands
  & IFindCommands
  & ISettingsCommands<Settings>
  & ITimeoutCommands
  & IEventCommands
  & IExecuteCommands
  & ISessionHandler<C, CreateResult, DeleteResult, SessionData>;
