import { W3C_ELEMENT_KEY } from './lib/protocol/helpers'

declare class BaseDriver {
    // class variables
    static baseVersion: string;
    static get argsConstraints(): {};

    constructor(opts?: {}, shouldValidateCaps?: boolean);

    // fields
    sessionId: string;
    opts: DriverOpts;
    initialOpts: DriverOpts;
    caps?: {};
    originalCaps?: {};
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
    supportedLogTypes: {[type: string]: LogType};

    // getters/setters
    get driverData(): {};
    get isCommandsQueueEnabled(): boolean;
    get eventHistory(): {};
    get desiredCapConstraints(): {};

    set desiredCapConstraints(constraints: {});

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
    reset(): Promise<void>;
    proxyActive(): boolean;
    getProxyAvoidList(): [string, RegExp][];
    canProxy(): boolean;
    proxyRouteIsAvoided(sessionId: string, method: string, url: string): boolean;
    addManagedDriver(driver: BaseDriver): void;
    getManagedDrivers(): BaseDriver[];
    clearNewCommandTimeout(): Promise<void>;
    startNewCommandTimeout(): Promise<void>;
    implicitWaitForCondition(condition: () => Promise<any>): Promise<any>;

    // commands
    createSession(jwpCaps: {}, jwpReqCaps: {}, w3cCaps: {}): Promise<[string, {}]>;
    getSessions(): Promise<{id: string, capabilities: {}}>
    getSession(): Promise<{}>
    deleteSession(): Promise<void>;
    getSettings(): Promise<DeviceSettings>;
    updateSettings(newSettings: {}): Promise<DeviceSettings>;
    logCustomEvent(vendor: string, event: string): void;
    getLogEvents(type?: string | string[]): {};
    executeDriverScript(script: string, scriptType: string, timeout: number): Promise<{}>;
    findElement(strategy: string, selector: string): Promise<Element>;
    findElements(strategy: string, selector: string): Promise<Element[]>;

    findElementFromElement(strategy: string, selector: string, elementId: string): Promise<Element>;
    findElementsFromElement(strategy: string, selector: string, elementId: string): Promise<Element[]>;
    findElOrEls(strategy: string, selector: string, mult: boolean, context: string): Promise<Element>;
    getLogTypes(): Promise<string[]>
    getLog(logType: string): Promise<{}[]>
    timeouts(type: string, ms: number, script: number, pageLoad: number, implicit: number): Promise<void>;
    getTimeouts(): Promise<{command: number, implicit: number}>;
    implicitWait(ms: number): Promise<void>;
    newCommandTimeout(ms: number): Promise<void>;
}

declare type DriverOpts = {
    tmpDir: string
    [key: string]: any
}

declare type Element = {
    'element-6066-11e4-a52e-4f735466cecf': string
}

declare interface DriverHelpers {
    configureApp: (
        app: string,
        supportedAppExtensions: string[]
    ) => Promise<string>;
    isPackageOrBundle: (app: string) => boolean;
    duplicateKeys: <T>(
        input: T,
        firstKey: string,
        secondKey: string
    ) => T;
    parseCapsArray: (cap: string|string[]) => string[]
}

declare type SettingsUpdater = (prop: string, newValue: {}, curValue: {}) => Promise<void>;

declare class DeviceSettings {
    constructor(defaultSettings: {}, onSettingsUpdate: SettingsUpdater);
    update(newSettings: {}): Promise<void>;
    getSettings(): DeviceSettings;
}

declare type LogType = {
    description: string
    getter: (driver: BaseDriver) => Promise<{}[]>
}

export { BaseDriver, DriverHelpers, DriverOpts, Element, LogType };
export default BaseDriver;
