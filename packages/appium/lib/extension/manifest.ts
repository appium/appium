import B from 'bluebird';
import {env, fs} from '@appium/support';
import _ from 'lodash';
import path from 'node:path';
import * as YAML from 'yaml';
import type {DriverType, ExtensionType, PluginType} from '@appium/types';
import type {ExtManifest, ExtPackageJson, ExtRecord, InternalMetadata, ManifestData} from 'appium/types';
import {CURRENT_SCHEMA_REV, DRIVER_TYPE, PLUGIN_TYPE} from '../constants';
import {INSTALL_TYPE_DEV, INSTALL_TYPE_NPM} from './extension-config';
import {packageDidChange} from './package-changed';
import {migrate} from './manifest-migrations';

const CONFIG_DATA_DRIVER_KEY = `${DRIVER_TYPE}s` as const;
const CONFIG_DATA_PLUGIN_KEY = `${PLUGIN_TYPE}s` as const;

const INITIAL_MANIFEST_DATA: Readonly<ManifestData> = Object.freeze({
  [CONFIG_DATA_DRIVER_KEY]: Object.freeze({}),
  [CONFIG_DATA_PLUGIN_KEY]: Object.freeze({}),
  schemaRev: CURRENT_SCHEMA_REV,
}) as Readonly<ManifestData>;

/**
 * Handles reading & writing of extension config files.
 *
 * Only one instance of this class exists per value of `APPIUM_HOME`.
 */
export class Manifest {
  #data!: ManifestData;
  readonly #appiumHome: string;
  #manifestPath: string | undefined = undefined;
  #writing: Promise<boolean> | undefined;
  #reading: Promise<void> | undefined;

  private constructor(appiumHome: string) {
    this.#appiumHome = appiumHome;
    this.#data = _.cloneDeep(INITIAL_MANIFEST_DATA) as ManifestData;
  }

  /**
   * Returns the memoized manifest for an `APPIUM_HOME` directory (one instance per home).
   *
   * @param appiumHome - `APPIUM_HOME` path used as the cache key
   */
  static getInstance = _.memoize((appiumHome: string): Manifest => new Manifest(appiumHome));

  /** `APPIUM_HOME` directory this manifest is tied to. */
  get appiumHome(): string {
    return this.#appiumHome;
  }

  /**
   * Absolute path to the extension manifest file after {@link Manifest.read} or {@link Manifest.write} has resolved it.
   * Before that, this is `undefined`.
   */
  get manifestPath(): string | undefined {
    return this.#manifestPath;
  }

  /** Schema revision of the in-memory manifest data (from YAML `schemaRev`). */
  get schemaRev(): number {
    return this.#data.schemaRev;
  }

  /**
   * Returns the live installed-extension map for drivers or plugins (same object as stored in memory).
   * Mutations affect the manifest until replaced by a new object (e.g. via `read()`); `setExtension` / `deleteExtension` update this record.
   *
   * @param extType - `"driver"` or `"plugin"`
   */
  getExtensionData<ExtType extends ExtensionType>(extType: ExtType): ExtRecord<ExtType> {
    const record = extType === DRIVER_TYPE ? this.#data.drivers : this.#data.plugins;
    return record as ExtRecord<ExtType>;
  }

  /**
   * Whether a driver with the given manifest key is present.
   *
   * @param name - Driver name as stored under `drivers` in the manifest
   */
  hasDriver(name: string): boolean {
    return Boolean(this.#data.drivers[name]);
  }

  /**
   * Whether a plugin with the given manifest key is present.
   *
   * @param name - Plugin name as stored under `plugins` in the manifest
   */
  hasPlugin(name: string): boolean {
    return Boolean(this.#data.plugins[name]);
  }

  /**
   * Loads manifest YAML from disk into memory, runs migration when needed, may sync with installed packages, and writes back if required.
   * Concurrent calls while a read is in flight share the same in-flight work.
   *
   * @returns The parsed in-memory manifest data
   */
  async read(): Promise<ManifestData> {
    if (this.#reading) {
      await this.#reading;
      return this.#data;
    }

    this.#reading = (async () => {
      let data: ManifestData;
      let shouldWrite = false;
      const manifestPathResolved = await this.#setManifestPath();
      try {
        const yaml = await fs.readFile(manifestPathResolved, 'utf8');
        data = YAML.parse(yaml) as ManifestData;
      } catch (err: any) {
        if (err.code === 'ENOENT') {
          data = _.cloneDeep(INITIAL_MANIFEST_DATA) as ManifestData;
          shouldWrite = true;
        } else {
          throw new Error(
            `Appium had trouble loading the extension installation ` +
              `cache file (${manifestPathResolved}). It may be invalid YAML. Specific error: ${
                err.message
              }`
          );
        }
      }

      this.#data = data;

      if (!shouldWrite && (data.schemaRev ?? 0) < CURRENT_SCHEMA_REV) {
        shouldWrite = await migrate(this);
      }

      const hasAppiumDependency = await env.hasAppiumDependency(this.appiumHome);

      if (shouldWrite || (hasAppiumDependency && (await packageDidChange(this.appiumHome)))) {
        shouldWrite = (await this.syncWithInstalledExtensions(hasAppiumDependency)) || shouldWrite;
      }

      if (shouldWrite) {
        await this.write();
      }
    })();

    try {
      await this.#reading;
      return this.#data;
    } finally {
      this.#reading = undefined;
    }
  }

  /**
   * Serializes the current in-memory manifest to the resolved manifest path.
   * Concurrent calls while a write is in flight share the same in-flight work.
   *
   * @returns `true` when the file was written successfully
   */
  async write(): Promise<boolean> {
    if (this.#writing) {
      return this.#writing;
    }
    this.#writing = (async () => {
      const manifestPathResolved = await this.#setManifestPath();
      try {
        await fs.mkdirp(path.dirname(manifestPathResolved));
      } catch (err: any) {
        throw new Error(
          `Appium could not create the directory for the manifest file: ${path.dirname(
            manifestPathResolved
          )}. Original error: ${err.message}`
        );
      }
      try {
        await fs.writeFile(manifestPathResolved, YAML.stringify(this.#data), 'utf8');
        return true;
      } catch (err: any) {
        throw new Error(
          `Appium could not write to manifest at ${manifestPathResolved} using APPIUM_HOME ${
            this.#appiumHome
          }. Please ensure it is writable. Original error: ${err.message}`
        );
      }
    })();
    try {
      return await this.#writing;
    } finally {
      this.#writing = undefined;
    }
  }

  /**
   * Scans `APPIUM_HOME` (root and `node_modules`) for Appium extension packages and merges them into the manifest.
   *
   * @param hasAppiumDependency - When true and the root `package.json` depends on Appium, matching extensions use the `"dev"` install type
   * @returns `true` if any extension entries changed, `false` otherwise
   */
  async syncWithInstalledExtensions(hasAppiumDependency = false): Promise<boolean> {
    let didChange = false;

    const onMatch = async (filepath: string, devType = false): Promise<void> => {
      try {
        const pkg = JSON.parse(await fs.readFile(filepath, 'utf8')) as unknown;
        if (isExtension(pkg)) {
          const installType = devType && hasAppiumDependency ? INSTALL_TYPE_DEV : INSTALL_TYPE_NPM;
          const changed = this.addExtensionFromPackage(pkg, filepath, installType);
          didChange = didChange || changed;
        }
      } catch {
        // ignore invalid package.json
      }
    };

    const queue: Promise<void>[] = [
      onMatch(path.join(this.#appiumHome, 'package.json'), true),
    ];

    const filepaths = await fs.glob('node_modules/{*,@*/*}/package.json', {
      cwd: this.#appiumHome,
      absolute: true,
    });
    for (const filepath of filepaths) {
      queue.push(onMatch(filepath));
    }

    await B.all(queue);

    return didChange;
  }

  /**
   * Builds manifest metadata from a `package.json` and registers it if it is a driver or plugin and the entry changed.
   *
   * @param pkgJson - Parsed extension `package.json`
   * @param pkgPath - Path to that `package.json` (install path is derived from its directory)
   * @param installType - How the package was discovered (`npm` vs `dev`)
   * @returns `true` if the manifest was updated, `false` if unchanged or already matched
   * @throws TypeError if the package is not a valid driver or plugin extension
   */
  addExtensionFromPackage(
    pkgJson: ExtPackageJson<ExtensionType>,
    pkgPath: string,
    installType: typeof INSTALL_TYPE_NPM | typeof INSTALL_TYPE_DEV = INSTALL_TYPE_NPM
  ): boolean {
    const extensionPath = path.dirname(pkgPath);

    const internal: InternalMetadata = {
      pkgName: pkgJson.name,
      version: pkgJson.version,
      appiumVersion: pkgJson.peerDependencies?.appium,
      installType,
      installSpec: `${pkgJson.name}@${pkgJson.version}`,
      installPath: extensionPath,
    };

    if (isDriver(pkgJson)) {
      const driverName = pkgJson.appium.driverName;
      const value = {
        ..._.omit(pkgJson.appium, 'driverName'),
        ...internal,
      };
      if (!_.isEqual(value, this.#data.drivers[driverName])) {
        this.setExtension(DRIVER_TYPE, driverName, value);
        return true;
      }
      return false;
    }
    if (isPlugin(pkgJson)) {
      const pluginName = pkgJson.appium.pluginName;
      const value = {
        ..._.omit(pkgJson.appium, 'pluginName'),
        ...internal,
      };
      if (!_.isEqual(value, this.#data.plugins[pluginName])) {
        this.setExtension(PLUGIN_TYPE, pluginName, value);
        return true;
      }
      return false;
    }
    throw new TypeError(
      `The extension in ${extensionPath} is neither a valid ${DRIVER_TYPE} nor a valid ${PLUGIN_TYPE}.`
    );
  }

  /**
   * Stores a deep-cloned copy of extension metadata under the given type and name.
   *
   * @param extType - `"driver"` or `"plugin"`
   * @param extName - Manifest key for the extension
   * @param extData - Full extension entry to persist in memory
   * @returns The cloned data now held in the manifest
   */
  setExtension<ExtType extends ExtensionType>(
    extType: ExtType,
    extName: string,
    extData: ExtManifest<ExtType>
  ): ExtManifest<ExtType> {
    const data = _.cloneDeep(extData) as ExtManifest<ExtType>;
    if (extType === DRIVER_TYPE) {
      this.#data.drivers[extName] = data as unknown as ExtManifest<DriverType>;
    } else {
      this.#data.plugins[extName] = data as unknown as ExtManifest<PluginType>;
    }
    return data;
  }

  /**
   * Updates the in-memory manifest schema revision (typically during migration).
   *
   * @param rev - New `schemaRev` value
   */
  setSchemaRev(rev: number): void {
    this.#data.schemaRev = rev;
  }

  /**
   * Removes an extension entry from the manifest data in memory (does not write to disk by itself).
   *
   * @param extType - `"driver"` or `"plugin"`
   * @param extName - Manifest key to remove
   */
  deleteExtension(extType: ExtensionType, extName: string): void {
    if (extType === DRIVER_TYPE) {
      delete this.#data.drivers[extName];
    } else {
      delete this.#data.plugins[extName];
    }
  }

  async #setManifestPath(): Promise<string> {
    if (!this.#manifestPath) {
      const resolved = await env.resolveManifestPath(this.#appiumHome);
      this.#manifestPath = resolved;

      if (path.relative(this.#appiumHome, resolved).startsWith('.')) {
        throw new Error(
          `Mismatch between location of APPIUM_HOME and manifest file. APPIUM_HOME: ${
            this.appiumHome
          }, manifest file: ${resolved}`
        );
      }
    }

    return this.#manifestPath;
  }
}

function isExtension(value: unknown): value is ExtPackageJson<ExtensionType> {
  return (
    _.isPlainObject(value) &&
    _.isPlainObject((value as {appium?: unknown}).appium) &&
    _.isString((value as {name?: unknown}).name) &&
    _.isString((value as {version?: unknown}).version)
  );
}

function isDriver(value: unknown): value is ExtPackageJson<DriverType> {
  return (
    isExtension(value) &&
    'driverName' in value.appium &&
    _.isString((value.appium as {driverName?: unknown}).driverName)
  );
}

function isPlugin(value: unknown): value is ExtPackageJson<PluginType> {
  return (
    isExtension(value) &&
    'pluginName' in value.appium &&
    _.isString((value.appium as {pluginName?: unknown}).pluginName)
  );
}
