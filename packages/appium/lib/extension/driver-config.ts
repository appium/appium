import {errors} from '@appium/base-driver';
import type {DriverClass, DriverType, NormalizedAppiumConfig, StringRecord} from '@appium/types';
import type {ExtManifest, ExtName, ExtRecord} from 'appium/types/index.js';

import {DRIVER_TYPE} from '../constants.js';
import {log} from '../logger.js';
import {ArgSpec} from '../schema/arg-spec.js';
import {appiumSchema, type AppiumSchema} from '../schema/schema.js';
import {ExtensionConfig} from './extension-config.js';
import {manifestValidator} from './manifest/index.js';
import type {ExtManifestProblem, Manifest} from './manifest/index.js';
import {describeEmbeddedDriver, readResolvedDriver} from './resolved-driver.js';
import type {EmbeddedDriver} from './resolved-driver.js';

export type MatchedDriver = {
  driver: DriverClass;
  version: string;
  driverName: string;
};

type DriverNameMap = Map<DriverClass, string>;

export class DriverConfig extends ExtensionConfig<DriverType> {
  private static readonly _instances = new WeakMap<Manifest, DriverConfig>();
  private knownAutomationNames = new Set<string>();
  /** Drivers added by {@linkcode DriverConfig.addResolvedDriver}; never written to the manifest */
  private readonly resolvedDrivers = new Map<string, ExtManifest<DriverType>>();
  private readonly driverNamesByLocation = new Map<string, string>();
  /** Driver classes passed directly to the programmatic Appium API. */
  private readonly embeddedDrivers = new Map<string, EmbeddedDriver>();
  private activeDriverNames?: Set<string>;

  private constructor(manifest: Manifest) {
    super(DRIVER_TYPE, manifest);
  }

  static create(manifest: Manifest): DriverConfig {
    const instance = new DriverConfig(manifest);
    if (DriverConfig.getInstance(manifest)) {
      throw new Error(
        `Manifest with APPIUM_HOME ${manifest.appiumHome} already has a DriverConfig; use DriverConfig.getInstance() to retrieve it.`,
      );
    }
    DriverConfig._instances.set(manifest, instance);
    return instance;
  }

  static getInstance(manifest: Manifest): DriverConfig | undefined {
    return DriverConfig._instances.get(manifest);
  }

  /** Creates an independent driver selection for one server without changing the CLI singleton. */
  createServerConfig(): DriverConfig {
    return new DriverConfig(this.manifest);
  }

  /**
   * Drivers installed in the manifest, preceded by any drivers added by
   * {@linkcode DriverConfig.addResolvedDriver}, which replace installed drivers of the same name.
   * Without such drivers, this is the live map held by the manifest.
   */
  override get installedExtensions(): ExtRecord<DriverType> {
    const installed = super.installedExtensions;
    if (this.resolvedDrivers.size === 0) {
      return installed;
    }
    const drivers: ExtRecord<DriverType> = Object.fromEntries(this.resolvedDrivers);
    for (const [driverName, driverData] of Object.entries(installed)) {
      drivers[driverName] ??= driverData;
    }
    return drivers;
  }

  /** Active names to pass to hooks when a server uses embedded or resolved drivers. */
  get activeProgrammaticDriverNames(): string[] | undefined {
    return this.activeDriverNames && [...this.activeDriverNames];
  }

  /** Returns automation names for installed, resolved and embedded drivers, keyed by driver name. */
  getAutomationNames(): Record<string, string> {
    const names = Object.fromEntries(
      Object.entries(this.installedExtensions).map(([name, data]) => [name, data.automationName]),
    );
    for (const {driverName, automationName} of this.embeddedDrivers.values()) {
      this.assertSameAutomationName(
        driverName,
        Object.hasOwn(names, driverName) ? names[driverName] : undefined,
        automationName,
      );
      names[driverName] = automationName;
    }
    return names;
  }

  async validate(): Promise<ExtRecord<DriverType>> {
    this.knownAutomationNames.clear();
    return await super._validate(this.manifest.getExtensionData(DRIVER_TYPE));
  }

  /**
   * Adds a driver from the location of its package rather than from `APPIUM_HOME`, e.g. a driver
   * that a package embedding Appium resolved with Node.js module resolution.
   *
   * The driver is only kept in memory, and it is preferred over an installed driver with the same
   * name or `automationName`. Different resolved packages cannot declare the same driver name.
   *
   * @param location - Absolute path or `file:` URL of the driver package or of any file in it,
   * such as its entry point
   * @returns The name of the driver
   */
  async addResolvedDriver(location: string): Promise<ExtName<DriverType>> {
    const cachedName = this.driverNamesByLocation.get(location);
    if (cachedName !== undefined) {
      return cachedName;
    }
    const {driverName, manifest} = await readResolvedDriver(location);
    const {installPath, automationName} = manifest;
    const previous = this.resolvedDrivers.get(driverName);
    if (previous && previous.installPath !== installPath) {
      throw new TypeError(
        `Resolved driver packages at '${previous.installPath}' and '${installPath}' both use the driver name '${driverName}'`,
      );
    }
    if (!previous && Object.hasOwn(super.installedExtensions, driverName)) {
      log.info(`The '${driverName}' driver at ${installPath} replaces the installed '${driverName}' driver`);
    }
    for (const embedded of this.embeddedDrivers.values()) {
      if (embedded.driverName === driverName) {
        this.assertSameAutomationName(driverName, embedded.automationName, automationName);
      }
    }
    this.resolvedDrivers.set(driverName, previous ?? manifest);
    this.driverNamesByLocation.set(location, driverName);
    return driverName;
  }

  /** Builds a schema for this startup without changing the process-wide installed schemas. */
  async getStartupSchema(): Promise<AppiumSchema> {
    if (!this.resolvedDrivers.size) {
      return appiumSchema;
    }
    const schema = appiumSchema.forResolvedDrivers(this.resolvedDrivers.keys());
    for (const [name, manifest] of this.resolvedDrivers) {
      const root = this.getInstallPath(name);
      const schemaProblems = await this.getSchemaProblems(manifest, name, {root, schema});
      if (schemaProblems.length) {
        throw new Error(`The driver at ${root} cannot be used: ${schemaProblems.map(({err}) => err).join('; ')}`);
      }
    }
    return schema;
  }

  /** Converts resolved drivers' config-file keys to the same names used by CLI flags and defaults. */
  normalizeResolvedDriverArgs(config: NormalizedAppiumConfig | undefined, schema: AppiumSchema): void {
    const driverArgs = config?.server?.driver;
    for (const name of this.resolvedDrivers.keys()) {
      const normalizedName = ArgSpec.toNormalizedExtName(name);
      const args = driverArgs?.[normalizedName];
      if (args && driverArgs) {
        driverArgs[normalizedName] = Object.fromEntries(
          Object.entries(args).map(([key, value]) => [
            schema.getArgSpec(key, DRIVER_TYPE, normalizedName)?.rawDest ?? key,
            value,
          ]),
        );
      }
    }
  }

  /**
   * Registers an already-imported driver class without mutating extensions.yaml.
   *
   * Uses a static automationName string, or the class name with a trailing Driver
   * suffix removed. Package metadata is not inferred from the class; use a resolved
   * package location when its declared automationName differs from the class name.
   */
  addEmbeddedDriver(driver: DriverClass): string {
    const entry = describeEmbeddedDriver(driver);
    const {driverName, automationName} = entry;
    const automationKey = automationName.toLowerCase();
    this.assertSameAutomationName(driverName, this.installedExtensions[driverName]?.automationName, automationName);
    const existing = this.embeddedDrivers.get(automationKey);
    if (existing && existing.driver !== driver) {
      throw new TypeError(`Multiple embedded drivers claim automationName '${automationName}'`);
    }
    for (const [otherAutomationName, embedded] of this.embeddedDrivers) {
      if (otherAutomationName !== automationKey && embedded.driverName === driverName) {
        throw new TypeError(`Multiple embedded automation names derive the driver name '${driverName}'`);
      }
    }
    this.embeddedDrivers.set(automationKey, entry);
    return driverName;
  }

  /** Loads the preferred drivers and applies the successfully loaded selection to session matching. */
  async applySelection(
    requestedNames: string[],
    load: (names: string[], rejectConflictingNames: boolean) => Promise<DriverNameMap>,
  ): Promise<DriverNameMap> {
    const programmatic = this.embeddedDrivers.size > 0 || this.resolvedDrivers.size > 0;
    const activeDrivers = await load(
      programmatic ? this.getPreferredDriverNames(requestedNames) : requestedNames,
      programmatic,
    );
    this.activeDriverNames = programmatic ? new Set(activeDrivers.values()) : undefined;
    return activeDrivers;
  }

  /** Prints the drivers loaded for a server, or the installed drivers if called without a selection. */
  override print(activeNames?: string[]): void {
    if (
      !activeNames ||
      (!activeNames.length && !Object.keys(this.installedExtensions).length && !this.embeddedDrivers.size)
    ) {
      super.print();
      return;
    }
    if (!activeNames.length) {
      log.info('No drivers are active.');
      return;
    }
    const embeddedByName = new Map([...this.embeddedDrivers.values()].map((entry) => [entry.driverName, entry]));
    const installed = this.installedExtensions;
    log.info('Active drivers:');
    for (const name of activeNames) {
      const embedded = embeddedByName.get(name);
      const manifest = installed[name];
      const description = embedded
        ? `${name} (embedded, automationName '${embedded.automationName}')`
        : manifest
          ? this.extensionDesc(name, manifest)
          : name;
      log.info(`  - ${description}`);
    }
  }

  public override extensionDesc(
    driverName: ExtName<DriverType>,
    {version, automationName}: ExtManifest<DriverType>,
  ): string {
    return `${String(driverName)}@${version} (automationName '${automationName}')`;
  }

  async findMatchingDriver<C extends StringRecord>({automationName, platformName}: C): Promise<MatchedDriver> {
    if (typeof platformName !== 'string') {
      throw new Error('You must include a platformName capability');
    }

    if (typeof automationName !== 'string') {
      throw new Error('You must include an automationName capability');
    }

    log.info(
      `Attempting to find matching driver for automationName ` +
        `'${automationName}' and platformName '${platformName}'`,
    );

    try {
      const embedded = this.embeddedDrivers.get(automationName.toLowerCase());
      if (embedded && (!this.activeDriverNames || this.activeDriverNames.has(embedded.driverName))) {
        if (
          embedded.platformNames &&
          !embedded.platformNames.some((name) => name.toLowerCase() === platformName.toLowerCase())
        ) {
          throw new Error(
            `Driver '${embedded.driverName}' supports automationName '${automationName}', ` +
              `but not platformName '${platformName}'. Supported platformNames are: ${JSON.stringify(embedded.platformNames)}`,
          );
        }
        log.info(`Using directly supplied '${embedded.driver.name}' driver for automationName '${automationName}'`);
        return {driver: embedded.driver, version: '', driverName: embedded.driverName};
      }

      const {driverName, mainClass, version} = this._getDriverBySupport(automationName, platformName);
      log.info(`The '${driverName}' driver was installed and matched caps.`);
      log.info(`Will require it at ${this.getInstallPath(driverName)}`);
      const driver = await this.requireAsync(driverName as ExtName<DriverType>);
      if (!driver) {
        throw new Error(
          `Driver '${driverName}' did not export a class with name '${mainClass}'. Contact the author of the driver!`,
        );
      }
      return {driver, version, driverName};
    } catch (err: any) {
      const msg =
        `Could not find a driver for automationName ` +
        `'${automationName}' and platformName '${platformName}'. ` +
        `Have you installed a driver that supports those ` +
        `capabilities? Run 'appium driver list --installed' to see. ` +
        `(Lower-level error: ${err.message})`;
      throw new errors.SessionNotCreatedError(msg, err);
    }
  }

  protected override getConfigProblems(extManifest: ExtManifest<DriverType>, extName: string): ExtManifestProblem[] {
    void extName;
    const problems = manifestValidator.getDriverManifestProblems(extManifest);
    // `?.`, not destructuring: a corrupted entry may be null/non-object (already reported above).
    const automationName = (extManifest as unknown as Record<string, unknown> | null | undefined)?.automationName;

    // Only track actual strings — `undefined` would make every automationName-less entry a "duplicate".
    if (typeof automationName === 'string') {
      if (this.knownAutomationNames.has(automationName)) {
        problems.push({
          err: 'Multiple drivers claim support for the same automationName',
          val: automationName,
        });
      }
      this.knownAutomationNames.add(automationName);
    }

    return problems;
  }

  private getPreferredDriverNames(requestedNames: string[]): string[] {
    const drivers = this.installedExtensions;
    const requested = new Set(requestedNames);
    const preferredNames = new Map<string, string>();
    const selectedPackages = new Map<string, string>();
    for (const [driverName, {automationName, pkgName}] of Object.entries(drivers)) {
      const automationKey = automationName.toLowerCase();
      if (requested.has(driverName) && this.resolvedDrivers.has(driverName)) {
        const previousPackage = selectedPackages.get(automationKey);
        if (previousPackage !== undefined) {
          throw new TypeError(
            `Resolved packages '${previousPackage}' and '${pkgName}' claim automationName '${automationName}'`,
          );
        }
        selectedPackages.set(automationKey, pkgName);
      }
      if (!this.embeddedDrivers.has(automationKey) && !preferredNames.has(automationKey)) {
        preferredNames.set(automationKey, driverName);
      }
    }
    return [...requested].filter((driverName) => {
      const {automationName} = drivers[driverName];
      const preferredName = preferredNames.get(automationName.toLowerCase());
      if (preferredName !== undefined && !requested.has(preferredName)) {
        throw new TypeError(
          `Requested driver '${driverName}' is shadowed by unselected driver '${preferredName}' ` +
            `for automationName '${automationName}'`,
        );
      }
      return preferredName === driverName;
    });
  }

  private _getDriverBySupport(
    matchAutomationName: string,
    matchPlatformName: string,
  ): ExtManifest<DriverType> & {driverName: string} {
    const drivers = this.installedExtensions;
    for (const [driverName, driverData] of Object.entries(drivers)) {
      if (this.activeDriverNames && !this.activeDriverNames.has(driverName)) {
        continue;
      }
      const {automationName, platformNames} = driverData;
      const aNameMatches = automationName.toLowerCase() === matchAutomationName.toLowerCase();
      const pNameMatches = platformNames.map((p) => p.toLowerCase()).includes(matchPlatformName.toLowerCase());

      if (aNameMatches && pNameMatches) {
        return {driverName, ...driverData};
      }

      if (aNameMatches) {
        throw new Error(
          `Driver '${driverName}' supports automationName ` +
            `'${automationName}', but Appium could not find ` +
            `support for platformName '${matchPlatformName}'. Supported ` +
            `platformNames are: ` +
            JSON.stringify(platformNames),
        );
      }
    }

    throw new Error(`Could not find installed driver to support given caps`);
  }

  private assertSameAutomationName(driverName: string, existing: string | undefined, incoming: string): void {
    if (existing !== undefined && existing.toLowerCase() !== incoming.toLowerCase()) {
      throw new TypeError(
        `An embedded driver and a package driver both use the name '${driverName}' for different automation names`,
      );
    }
  }
}
