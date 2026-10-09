import path from 'node:path';
import {fileURLToPath} from 'node:url';

import {fs, util} from '@appium/support';
import type {DriverClass, DriverType, StringRecord} from '@appium/types';
import type {ExtManifest, ExtName, ExtPackageJson, ExtRecord} from 'appium/types/index.js';

import {DRIVER_TYPE} from '../constants.js';
import {log} from '../logger.js';
import {ExtensionConfig} from './extension-config.js';
import {INSTALL_TYPE_LOCAL, manifestValidator} from './manifest/index.js';
import type {ExtManifestProblem, Manifest} from './manifest/index.js';

export type MatchedDriver = {
  driver: DriverClass;
  version: string;
  driverName: string;
};

export class DriverConfig extends ExtensionConfig<DriverType> {
  private static readonly _instances = new WeakMap<Manifest, DriverConfig>();
  private knownAutomationNames = new Set<string>();
  /** Drivers added by {@linkcode DriverConfig.addResolvedDriver}; never written to the manifest */
  private resolvedDrivers: ExtRecord<DriverType> = {};
  /** Driver classes passed directly to the programmatic Appium API. */
  private embeddedDrivers = new Map<string, {driver: DriverClass; driverName: string}>();

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

  /**
   * Drivers installed in the manifest, preceded by any drivers added by
   * {@linkcode DriverConfig.addResolvedDriver}, which replace installed drivers of the same name.
   * Without such drivers, this is the live map held by the manifest.
   */
  override get installedExtensions(): ExtRecord<DriverType> {
    const installed = super.installedExtensions;
    if (util.isEmpty(this.resolvedDrivers)) {
      return installed;
    }
    const drivers: ExtRecord<DriverType> = {...this.resolvedDrivers};
    for (const [driverName, driverData] of Object.entries(installed)) {
      drivers[driverName] ??= driverData;
    }
    return drivers;
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
   * name or `automationName`.
   *
   * @param location - Absolute path or `file:` URL of the driver package or of any file in it,
   * such as its entry point
   * @returns The name of the driver
   */
  async addResolvedDriver(location: string): Promise<ExtName<DriverType>> {
    const pkgJsonPath = await findDriverPackageJson(location);
    const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8')) as ExtPackageJson<DriverType>;
    const installPath = path.dirname(pkgJsonPath);
    const {driverName, ...driverMeta} = pkgJson.appium;
    const extManifest = {
      ...driverMeta,
      pkgName: pkgJson.name,
      version: pkgJson.version,
      appiumVersion: pkgJson.peerDependencies?.appium,
      installType: INSTALL_TYPE_LOCAL,
      installSpec: installPath,
      installPath,
    } as ExtManifest<DriverType>;

    const problems = [
      ...manifestValidator.getCommonManifestProblems(extManifest),
      ...manifestValidator.getDriverManifestProblems(extManifest),
    ];
    if (!util.isEmpty(problems)) {
      const details = problems.map(({err, val}) => `${err} (Actual value: ${JSON.stringify(val)})`).join('; ');
      throw new Error(`The driver at ${installPath} cannot be used: ${details}`);
    }

    if (driverName in super.installedExtensions) {
      log.info(`The '${driverName}' driver at ${installPath} replaces the installed '${driverName}' driver`);
    }
    this.resolvedDrivers[driverName] = extManifest;
    return driverName as ExtName<DriverType>;
  }

  /**
   * Registers an already-imported driver class without mutating extensions.yaml.
   *
   * The conventional *Driver class suffix gives programmatic callers a stable
   * automation identity (XCUITestDriver -> XCUITest, UiAutomator2Driver ->
   * UiAutomator2). A driver may instead expose a static automationName string.
   */
  addEmbeddedDriver(driver: DriverClass): string {
    const declaredAutomationName = (driver as DriverClass & {automationName?: unknown}).automationName;
    const automationName =
      typeof declaredAutomationName === 'string'
        ? declaredAutomationName
        : driver.name.replace(/Driver$/, '');
    if (!automationName) {
      throw new TypeError('An embedded Appium driver must have a class name or static automationName');
    }
    const driverName = automationName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
    if (!driverName) {
      throw new TypeError(`Could not derive a driver name from automationName '${automationName}'`);
    }
    this.embeddedDrivers.set(automationName.toLowerCase(), {driver, driverName});
    return driverName;
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

    const embedded = this.embeddedDrivers.get(automationName.toLowerCase());
    if (embedded) {
      log.info(`Using directly supplied '${embedded.driver.name}' driver for automationName '${automationName}'`);
      return {driver: embedded.driver, version: '', driverName: embedded.driverName};
    }

    try {
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
      throw new Error(msg, {cause: err});
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

  private _getDriverBySupport(
    matchAutomationName: string,
    matchPlatformName: string,
  ): ExtManifest<DriverType> & {driverName: string} {
    const drivers = this.installedExtensions;
    for (const [driverName, driverData] of Object.entries(drivers)) {
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
}

/**
 * Finds the `package.json` of the driver package containing `location`.
 *
 * Nested `package.json` files without a `name`, like ones that only set the module `type`, are skipped.
 *
 * @param location - Absolute path or `file:` URL of the driver package or of any file in it
 */
async function findDriverPackageJson(location: string): Promise<string> {
  const locationPath = location.startsWith('file:') ? fileURLToPath(location) : location;
  if (!path.isAbsolute(locationPath)) {
    throw new TypeError(`A driver location must be an absolute path or a file URL, but got '${location}'`);
  }
  if (!(await fs.exists(locationPath))) {
    throw new Error(`Could not find a driver at '${location}' because the path does not exist`);
  }

  let dir = (await fs.stat(locationPath)).isDirectory() ? locationPath : path.dirname(locationPath);
  for (;;) {
    const pkgJsonPath = path.join(dir, 'package.json');
    if (await fs.exists(pkgJsonPath)) {
      const pkgJson = JSON.parse(await fs.readFile(pkgJsonPath, 'utf8')) as Partial<ExtPackageJson<DriverType>>;
      if (typeof pkgJson.name === 'string') {
        if (typeof pkgJson.appium?.driverName !== 'string') {
          throw new Error(
            `The package '${pkgJson.name}' at ${dir} is not an Appium driver: its package.json has no 'appium.driverName' field`,
          );
        }
        return pkgJsonPath;
      }
    }
    const parentDir = path.dirname(dir);
    if (parentDir === dir) {
      throw new Error(`Could not find the package.json of a driver package containing '${location}'`);
    }
    dir = parentDir;
  }
}
