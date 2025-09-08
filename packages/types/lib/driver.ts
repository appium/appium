import type {EventEmitter} from 'node:events';
import type {Merge} from 'type-fest';
import type {Capabilities, DriverCaps, W3CCapabilities} from './capabilities';
import type {
  BidiModuleMap,
  BiDiResultData,
  ExecuteMethodMap,
  MethodMap,
} from './command-maps';
import type {
  DefaultCreateSessionResult,
  DefaultDeleteSessionResult,
  DriverData,
  EventHistory,
  IImplementedCommands,
  IWDClassicCommands,
  IAppiumCommands,
  IJSONWPCommands,
  IMJSONWPCommands,
  IOtherProtocolCommands,
} from './commands';
import type {Constraints} from './constraints';
import type {ServerArgs} from './config';
import type {HTTPHeaders, HTTPMethod} from './http';
import type {AppiumLogger} from './logger';
import type {AppiumServer, UpdateServerCallback} from './server';
import type {Class, StringRecord} from './util';
import type internal from 'node:stream';

/**
 * Interface implemented by the `DeviceSettings` class in `@appium/base-driver`
 */
export interface IDeviceSettings<T extends StringRecord> {
  update(newSettings: T): Promise<void>;
  getSettings(): T;
}

export interface DriverHelpers {
  configureApp: (
    app: string,
    supportedAppExtensions?: string | string[] | ConfigureAppOptions,
  ) => Promise<string>;
  isPackageOrBundle: (app: string) => boolean;
  duplicateKeys: <T>(input: T, firstKey: string, secondKey: string) => T;
  parseCapsArray: (cap: string | string[]) => string[];
  generateDriverLogPrefix: (obj: object, sessionId?: string) => string;
}

export type SettingsUpdateListener<T extends Record<string, unknown> = Record<string, unknown>> = (
  prop: keyof T,
  newValue: unknown,
  curValue: unknown,
) => Promise<void>;

export type Protocol = 'MJSONWP' | 'W3C';

/**
 * Methods and properties which both `AppiumDriver` and `BaseDriver` inherit.
 *
 * This should not be used directly by external code.
 */
export interface Core<C extends Constraints, Settings extends StringRecord = StringRecord> {
  shouldValidateCaps: boolean;
  sessionId: string | null;
  sessionCreationTimestampMs: number;
  opts: DriverOpts<C>;
  initialOpts: InitialOpts;
  protocol?: Protocol;
  helpers: DriverHelpers;
  basePath: string;
  relaxedSecurityEnabled: boolean;
  allowInsecure: string[];
  denyInsecure: string[];
  newCommandTimeoutMs: number;
  implicitWaitMs: number;
  locatorStrategies: string[];
  webLocatorStrategies: string[];
  eventEmitter: EventEmitter;
  settings: IDeviceSettings<Settings>;
  log: AppiumLogger;
  driverData: DriverData;
  isCommandsQueueEnabled: boolean;
  eventHistory: EventHistory;
  bidiEventSubs: Record<string, string[]>;
  updateBidiCommands(cmds: BidiModuleMap): void;
  onUnexpectedShutdown(handler: () => any): void;
  /**
   * @summary Retrieve the server's current status.
   * @description
   * Returns information about whether a remote end is in a state in which it can create new sessions and can additionally include arbitrary meta information that is specific to the implementation.
   *
   * The readiness state is represented by the ready property of the body, which is false if an attempt to create a session at the current time would fail. However, the value true does not guarantee that a New Session command will succeed.
   *
   * Implementations may optionally include additional meta information as part of the body, but the top-level properties ready and message are reserved and must not be overwritten.
   *
   * @example
   * ```js
   * // webdriver.io example
   * await driver.status();
   * ```
   *
   * ```python
   * driver.get_status()
   * ```
   *
   * ```java
   * driver.getStatus();
   * ```
   *
   * ```ruby
   * # ruby_lib example
   * remote_status
   *
   * # ruby_lib_core example
   * @driver.remote_status
   * ```
   */
  getStatus(): Promise<any>;
  sessionExists(sessionId?: string): boolean;
  isW3CProtocol(): boolean;
  isMjsonwpProtocol(): boolean;
  isFeatureEnabled(name: string): boolean;
  assertFeatureEnabled(name: string): void;
  validateLocatorStrategy(strategy: string, webContext?: boolean): void;
  proxyActive(sessionId?: string): boolean;
  get bidiProxyUrl(): string | null;
  getProxyAvoidList(sessionId?: string): RouteMatcher[];
  canProxy(sessionId?: string): boolean;
  proxyRouteIsAvoided(sessionId: string, method: string, url: string, body?: any): boolean;
  addManagedDriver(driver: Driver): void;
  getManagedDrivers(): Driver<Constraints>[];
  clearNewCommandTimeout(): Promise<void>;
  logEvent(eventName: string): void;
  driverForSession(sessionId: string): Core<Constraints> | null;
}

/**
 * `BaseDriver` implements this.  It contains default behavior;
 * external drivers are expected to implement {@linkcode ExternalDriver} instead.
 *
 * `C` should be the constraints of the driver.
 * `CArgs` would be the shape of `cliArgs`.
 * `Settings` is the shape of the raw device settings object (see {@linkcode IDeviceSettings})
 */
export interface Driver<
  C extends Constraints = Constraints,
  CArgs extends StringRecord = StringRecord,
  Settings extends StringRecord = StringRecord,
  CreateResult = DefaultCreateSessionResult<C>,
  DeleteResult = DefaultDeleteSessionResult,
  SessionData extends StringRecord = StringRecord,
> extends IImplementedCommands<C, Settings, CreateResult, DeleteResult, SessionData>,
    Core<C, Settings> {
  /**
   * The set of command line arguments set for this driver
   */
  cliArgs: CArgs;
  // The following properties are assigned by appium */
  server?: AppiumServer;
  serverHost?: string;
  serverPort?: number;
  serverPath?: string;

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
   * A helper method to modify the command name before it's logged.
   *
   * Useful for resolving generic commands like 'execute' to a more specific
   * name based on arguments (e.g., identifying custom extensions).
   *
   * @param cmd - The original command name
   * @param args - Arguments passed to the command
   * @returns A potentially updated command name
   */
  clarifyCommandName?(cmd: string, args: string[]): string;

  /** Execute a driver (WebDriver Bidi protocol) command by its name as defined in the bidi commands file
   * @param bidiCmd - the name of the command in the bidi spec
   * @param args - arguments to pass to the command
   */
  executeBidiCommand(bidiCmd: string, ...args: any[]): Promise<BiDiResultData>;

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
  validateDesiredCaps(caps: DriverCaps<C>): boolean;

  /**
   * A helper function to log unrecognized capabilities to the console
   *
   * @params caps - the capabilities
   *
   * @internal
   */
  logExtraCaps(caps: DriverCaps<C>): void;

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
 * External drivers must subclass `BaseDriver`, and can implement any methods from this interface.
 * None of these methods are implemented within Appium itself.
 */
export interface ExternalDriver<
  C extends Constraints = Constraints,
  Ctx = string,
  CArgs extends StringRecord = StringRecord,
  Settings extends StringRecord = StringRecord,
  CreateResult = DefaultCreateSessionResult<C>,
  DeleteResult = DefaultDeleteSessionResult,
  SessionData extends StringRecord = StringRecord,
> extends Driver<C, CArgs, Settings, CreateResult, DeleteResult, SessionData>,
    IWDClassicCommands,
    IAppiumCommands,
    IJSONWPCommands,
    IMJSONWPCommands<Ctx>,
    IOtherProtocolCommands {
  /**
   * Proxy a command to a connected WebDriver server
   *
   * @typeParam TReq - the type of the incoming body
   * @typeParam TRes - the type of the return value
   * @param url - the incoming URL
   * @param method - the incoming HTTP method
   * @param body - the incoming HTTP body
   *
   * @returns The return value of the proxied command
   */
  proxyCommand?<TReq = any, TRes = unknown>(
    url: string,
    method: HTTPMethod,
    body?: TReq,
  ): Promise<TRes>;
}

/**
 * Static members of a {@linkcode DriverClass}.
 *
 * This is likely unusable by external consumers, but YMMV!
 */
export interface DriverStatic<T extends Driver> {
  baseVersion: string;
  updateServer?: UpdateServerCallback;
  newMethodMap?: MethodMap<T>;
  /**
    * Drivers can define new custom bidi commands and map them to driver methods. The format must
    * be the same as that used by Appium's bidi-commands.js file, for example:
    * @example
    * {
    *   myNewBidiModule: {
    *     myNewBidiCommand: {
    *       command: 'driverMethodThatWillBeCalled',
    *       params: {
    *         required: ['requiredParam'],
    *         optional: ['optionalParam'],
    *       }
    *     }
    *   }
    * }
    */
  newBidiCommands?: BidiModuleMap;
  executeMethodMap?: ExecuteMethodMap<T>;
}

/**
 * Represents a driver class, which is used internally by Appium.
 *
 * This is likely unusable by external consumers, but YMMV!
 */
export type DriverClass<T extends Driver = Driver> = Class<
  T,
  DriverStatic<T>,
  [] | [Partial<ServerArgs>] | [Partial<ServerArgs>, boolean]
>;

export interface ExtraDriverOpts {
  fastReset?: boolean;
  skipUninstall?: boolean;
}
/**
 * Options as set within {@linkcode ExternalDriver.createSession}, which is a union of {@linkcode InitialOpts} and {@linkcode DriverCaps}.
 */
export type DriverOpts<C extends Constraints> = InitialOpts & DriverCaps<C>;

/**
 * Options as provided to the {@linkcode Driver} constructor.
 */
export type InitialOpts = Merge<ServerArgs, ExtraDriverOpts>;

/**
 * An instance method of a driver class, whose name may be referenced by {@linkcode MethodDef.command}, and serves as an Appium command.
 *
 * Note that this signature differs from a `PluginCommand`.
 */
export type DriverCommand<TArgs extends readonly any[] = any[], TRetval = unknown> = (
  ...args: TArgs
) => Promise<TRetval>;

/**
 * Tuple of an HTTP method with a regex matching a request path
 */
export type RouteMatcher = [HTTPMethod, RegExp];

/**
 * Result of the {@linkcode onPostProcess ConfigureAppOptions.onPostProcess} callback.
 */
export interface PostProcessResult {
  /**
   * The full past to the post-processed application package on the local file system .
   *
   * This might be a file or a folder path.
   */
  appPath: string;
}

/**
 * Information about a cached app instance.
 */
export interface CachedAppInfo {
  /**
   * SHA1 hash of the package if it is a file (and not a folder)
   */
  packageHash: string;
  /**
   * Date instance; the value of the file's `Last-Modified` header
   */
  lastModified?: Date|null;
  /**
   * The value of the file's `Etag` header
   */
  etag?: string|null;
  /**
   * `true` if the file contains an `immutable` mark in `Cache-control` header
   */
  immutable?: boolean;
  /**
   * Integer representation of `maxAge` parameter in `Cache-control` header
   */
  maxAge?: number|null;
  /**
   * The timestamp this item has been added to the cache (measured in Unix epoch milliseconds)
   */
  timestamp?: number;
  /**
   * An object containing either `file` property with SHA1 hash of the file or `folder` property
   * with total amount of cached files and subfolders
   */
  integrity?: {file?: string} | {folder?: number};
  /**
   * The full path to the cached app
   */
  fullPath?: string;
}

/**
 * Options for the post-processing step
 *
 * The generic can be supplied if using `axios`, where `headers` is a fancy object.
 */
export interface PostProcessOptions<Headers = HTTPHeaders> {
  /**
   * The original application url or path
   */
  originalAppLink: string;
  /**
   * The information about the previously cached app instance (if exists)
   */
  cachedAppInfo?: CachedAppInfo;
  /**
   * Whether the app has been downloaded from a remote URL
   */
  isUrl?: boolean;
  /**
   * Optional headers object.
   *
   * Only present if `isUrl` is `true` and if the server responds to `HEAD` requests. All header names are normalized to lowercase.
   */
  headers?: Headers;
  /**
   * A string containing full path to the preprocessed application package (either downloaded or a local one)
   */
  appPath?: string;
}

export interface DownloadAppOptions<Headers = HTTPHeaders> {
  /**
   * The original application url.
   */
  url: string;
  /**
   * Response headers from the download url.
   */
  headers: Headers;

  /**
   * Response stream.
   */
  stream: internal.Readable;
}

export interface ConfigureAppOptions {
  /**
   *
   * Optional function, which should be applied to the application after it is
   * downloaded/preprocessed.
   *
   * This function may be async and is expected to accept single object parameter. The function is
   * expected to either return a falsy value, which means the app must not be cached and a fresh
   * copy of it is downloaded each time, _or_ if this function returns an object containing an
   * `appPath` property, then the integrity of it will be verified and stored into the cache.
   * @returns
   */
  onPostProcess?: (
    obj: PostProcessOptions,
  ) => Promise<PostProcessResult | undefined> | PostProcessResult | undefined;
  /**
   * Optional function, which should be applied to the application upon download
   * progress initialization instead of the standard download handler.
   * The callback does not get invoked if the original application is not a URL.
   * It is expected that `onPostProcess` is also provided if this callback is defined.
   * Otherwise, there is a possibility the app configuration flow could be broken.
   *
   * @returns The full path to the downloaded app
   */
  onDownload?: (
    obj: DownloadAppOptions,
  ) => Promise<string>;
  supportedExtensions: string[];
}
