// @ts-check

/**
 * Module containing {@link Manifest} which handles reading & writing of extension config files.
 */

import { env, fs } from '@appium/support';
import _ from 'lodash';
import path from 'path';
import YAML from 'yaml';
import { DRIVER_TYPE, PLUGIN_TYPE } from '../constants';
import log from '../logger';
import { INSTALL_TYPE_NPM } from './extension-config';
import { packageDidChange } from './package-changed';

/**
 * Default depth to search in directory tree for whatever it is we're looking for.
 *
 * It's 4 because smaller numbers didn't work.
 */
const DEFAULT_SEARCH_DEPTH = 4;

/**
 * Default options for {@link findExtensions}.
 * @type {Readonly<import('klaw').Options>}
 */
const DEFAULT_FIND_EXTENSIONS_OPTS = Object.freeze({
  depthLimit: DEFAULT_SEARCH_DEPTH,
  /* istanbul ignore next */
  filter: (filepath) => !path.basename(filepath).startsWith('.'),
});

/**
 * Current configuration schema revision!
 */
const CONFIG_SCHEMA_REV = 2;

/**
 * The name of the prop (`drivers`) used in `extensions.yaml` for drivers.
 * @type {`${typeof DRIVER_TYPE}s`}
 */
const CONFIG_DATA_DRIVER_KEY = `${DRIVER_TYPE}s`;

/**
 * The name of the prop (`plugins`) used in `extensions.yaml` for plugins.
 * @type {`${typeof PLUGIN_TYPE}s`}
 */
const CONFIG_DATA_PLUGIN_KEY = `${PLUGIN_TYPE}s`;

/**
 * @type {Readonly<ManifestData>}
 */
const INITIAL_MANIFEST_DATA = Object.freeze({
  [CONFIG_DATA_DRIVER_KEY]: Object.freeze({}),
  [CONFIG_DATA_PLUGIN_KEY]: Object.freeze({}),
  schemaRev: CONFIG_SCHEMA_REV,
});

/**
 * Given a `package.json` return `true` if it represents an Appium Extension (either a driver or plugin).
 *
 * The `package.json` must have an `appium` property which is an object.
 * @param {any} value
 * @returns {value is ExtensionPackageJson<ExtensionType>}
 */
function isExtension (value) {
  return (
    _.isPlainObject(value) &&
    _.isPlainObject(value.appium) &&
    _.isString(value.name) &&
    _.isString(value.version)
  );
}
/**
 * Given a `package.json`, return `true` if it represents an Appium Driver.
 *
 * To be considered a driver, a `package.json` must have a fields
 * `appium.driverName`, `appium.automationName` and `appium.platformNames`.
 * @param {any} value - Value to test
 * @returns {value is ExtensionPackageJson<DriverType>}
 */
function isDriver (value) {
  return (
    isExtension(value) &&
    _.isString(_.get(value, 'appium.driverName')) &&
    _.isString(_.get(value, 'appium.automationName')) &&
    _.isArray(_.get(value, 'appium.platformNames'))
  );
}

/**
 * Given a `package.json`, return `true` if it represents an Appium Plugin.
 *
 * To be considered a plugin, a `package.json` must have an `appium.pluginName` field.
 * @param {any} value - Value to test
 * @returns {value is ExtensionPackageJson<PluginType>}
 */
function isPlugin (value) {
  return isExtension(value) && _.isString(_.get(value, 'appium.pluginName'));
}

/**
 * Handles reading & writing of extension config files.
 *
 * Only one instance of this class exists per value of `APPIUM_HOME`.
 */
export class Manifest {
  /**
   * The entire contents of a parsed YAML extension config file.
   *
   * Contains proxies for automatic persistence on disk
   * @type {ManifestData}
   * @private
   */
  _data;

  /**
   * Path to `APPIUM_HOME`.
   * @private
   * @type {Readonly<string>}
   */
  _appiumHome;

  /**
   * Path to `extensions.yaml`
   * @type {string}
   * Not set until {@link Manifest.read} is called.
   */
  _manifestPath;

  /**
   * Helps avoid writing multiple times.
   *
   * If this is `undefined`, calling {@link Manifest.write} will cause it to be
   * set to a `Promise`. When the call to `write()` is complete, the `Promise`
   * will resolve and then this value will be set to `undefined`.  Concurrent calls
   * made while this value is a `Promise` will return the `Promise` itself.
   * @private
   * @type {Promise<boolean>|undefined}
   */
  _writing;

  /**
   * Helps avoid reading multiple times.
   *
   * If this is `undefined`, calling {@link Manifest.read} will cause it to be
   * set to a `Promise`. When the call to `read()` is complete, the `Promise`
   * will resolve and then this value will be set to `undefined`.  Concurrent calls
   * made while this value is a `Promise` will return the `Promise` itself.
   * @private
   * @type {Promise<void>|undefined}
   */
  _reading;

  /**
   * Sets internal data to a fresh clone of {@link INITIAL_MANIFEST_DATA}
   *
   * Use {@link Manifest.getInstance} instead.
   * @param {string} appiumHome
   * @private
   */
  constructor (appiumHome) {
    this._appiumHome = appiumHome;
    this._data = _.cloneDeep(INITIAL_MANIFEST_DATA);
  }

  /**
   * Returns a new or existing {@link Manifest} instance, based on the value of `appiumHome`.
   *
   * Maintains one instance per value of `appiumHome`.
   * @param {string} appiumHome - Path to `APPIUM_HOME`
   * @returns {Manifest}
   */
  static getInstance = _.memoize(function _getInstance (
    appiumHome,
  ) {
    return new Manifest(appiumHome);
  });

  /**
   * Searches `APPIUM_HOME` for installed extensions and adds them to the manifest.
   * @param {SyncWithInstalledExtensionsOpts} opts
   * @returns {Promise<boolean>} `true` if any extensions were added, `false` otherwise.
   */
  async syncWithInstalledExtensions ({depthLimit = DEFAULT_SEARCH_DEPTH} = {}) {
    const walkOpts = _.defaults({depthLimit}, DEFAULT_FIND_EXTENSIONS_OPTS);
    // this could be parallelized, but we can't use fs.walk as an async iterator
    let didChange = false;
    for await (const {stats, path: filepath} of fs.walk(
      this._appiumHome,
      walkOpts,
    )) {
      if (filepath !== this._appiumHome && stats.isDirectory()) {
        try {
          const pkg = await env.readPackageInDir(filepath);
          if (pkg && isExtension(pkg)) {
            this.addExtensionFromPackage(
              pkg,
              path.join(filepath, 'package.json'),
            );
            didChange = true;
          }
        } catch {}
      }
    }
    return didChange;
  }

  /**
   * Given a path to a `package.json`, add it as either a driver or plugin to the manifest.
   *
   * Will _not_ overwrite existing entries.
   * @template {ExtensionType} ExtType
   * @param {ExtensionPackageJson<ExtType>} pkgJson
   * @param {string} pkgPath
   * @returns {void}
   */
  addExtensionFromPackage (pkgJson, pkgPath) {
    if (!isExtension(pkgJson)) {
      return;
    }

    /**
     * @type {InternalData}
     */
    const internal = {
      pkgName: pkgJson.name,
      version: pkgJson.version,
      installType: INSTALL_TYPE_NPM,
      installSpec: `${pkgJson.name}@${pkgJson.version}`,
    };

    if (isDriver(pkgJson)) {
      if (!this._data.drivers[pkgJson.appium.driverName]) {
        this._data.drivers[pkgJson.appium.driverName] = {
          ..._.omit(pkgJson.appium, 'driverName'),
          ...internal,
        };
      }
    } else if (isPlugin(pkgJson)) {
      if (!this._data.plugins[pkgJson.appium.pluginName]) {
        this._data.plugins[pkgJson.appium.pluginName] = {
          ..._.omit(pkgJson.appium, 'pluginName'),
          ...internal,
        };
      }
    } else {
      throw new TypeError(
        `The extension in ${path.dirname(
          pkgPath,
        )} is neither a valid driver nor a valid plugin.`,
      );
    }
  }

  /**
   * Adds an extension to the manifest as was installed by the `appium` CLI.  It determines the
   * `extData`, `extType`, `extName` itself.
   *
   * See {@link Manifest.addExtensionFromPackage} for adding an extension from an on-disk package.
   * @template {ExtensionType} ExtType
   * @param {ExtType} extType
   * @param {string} extName
   * @param {ExtData<ExtType>} extData
   * @returns {void}
   */
  addExtension (extType, extName, extData) {
    this._data[`${extType}s`][extName] = extData;
  }

  /**
   * Returns the APPIUM_HOME path
   */
  get appiumHome () {
    return this._appiumHome;
  }

  /**
   * Returns the path to the manifest file
   */
  get manifestPath () {
    return this._manifestPath;
  }

  /**
   * Returns extension data for a particular type.
   *
   * @template {ExtensionType} ExtType
   * @param {ExtType} extType
   * @returns {ExtRecord<ExtType>}
   */
  getExtensionData (extType) {
    return this._data[/** @type {string} */ (`${extType}s`)];
  }

  /**
   * Reads manifest from disk and _overwrites_ the internal data.
   *
   * If the manifest does not exist on disk, an {@link INITIAL_MANIFEST_DATA "empty"} manifest file will be created.
   *
   * If `APPIUM_HOME` contains a `package.json` with an `appium` dependency, then a hash of the `package.json` will be taken. If this hash differs from the last hash, the contents of `APPIUM_HOME/node_modules` will be scanned for extensions that may have been installed outside of the `appium` CLI.  Any found extensions will be added to the manifest file, and if so, the manifest file will be written to disk.
   *
   * Only one read operation should happen at a time.  This is controlled via the {@link Manifest._reading} property.
   * @returns {Promise<ManifestData>} The data
   */
  async read () {
    if (this._reading) {
      await this._reading;
      return this._data;
    }

    this._reading = (async () => {
      /** @type {ManifestData} */
      let data;
      let isNewFile = false;
      await this._setManifestPath();
      try {
        log.debug(`Reading ${this._manifestPath}...`);
        const yaml = await fs.readFile(this._manifestPath, 'utf8');
        data = YAML.parse(yaml);
      } catch (err) {
        if (err.code === 'ENOENT') {
          data = _.cloneDeep(INITIAL_MANIFEST_DATA);
          isNewFile = true;
        } else {
          if (this._manifestPath) {
            throw new Error(
              `Appium had trouble loading the extension installation ` +
                `cache file (${this._manifestPath}). It may be invalid YAML. Specific error: ${err.message}`,
            );
          } else {
            throw new Error(
              `Appium encountered an unknown problem. Specific error: ${err.message}`,
            );
          }
        }
      }

      this._data = data;
      let installedExtensionsChanged = false;
      if (
        await env.hasAppiumDependency(this.appiumHome) &&
        (await packageDidChange(this.appiumHome))
      ) {
        installedExtensionsChanged = await this.syncWithInstalledExtensions();
      }

      if (isNewFile || installedExtensionsChanged) {
        await this.write();
      }
    })();
    try {
      await this._reading;
      return this._data;
    } finally {
      this._reading = undefined;
    }
  }

  /**
   * Ensures {@link Manifest._manifestPath} is set.
   *
   * Creates the directory if necessary.
   * @private
   * @returns {Promise<string>}
   */
  async _setManifestPath () {
    if (!this._manifestPath) {
      this._manifestPath = await env.resolveManifestPath(this._appiumHome);

      /* istanbul ignore if */
      if (path.relative(this._appiumHome, this._manifestPath).startsWith('.')) {
        throw new Error(
          `Mismatch between location of APPIUM_HOME and manifest file. APPIUM_HOME: ${this.appiumHome}, manifest file: ${this._manifestPath}`,
        );
      }
    }

    return this._manifestPath;
  }

  /**
   * Writes the data if it need s writing.
   *
   * If the `schemaRev` prop needs updating, the file will be written.
   *
   * @todo If this becomes too much of a bottleneck, throttle it.
   * @returns {Promise<boolean>} Whether the data was written
   */
  async write () {
    if (this._writing) {
      return this._writing;
    }
    this._writing = (async () => {
      await this._setManifestPath();
      try {
        await fs.mkdirp(path.dirname(this._manifestPath));
      } catch (err) {
        throw new Error(
          `Appium could not create the directory for the manifest file: ${path.dirname(
            this._manifestPath,
          )}. Original error: ${err.message}`,
        );
      }
      try {
        await fs.writeFile(
          this._manifestPath,
          YAML.stringify(this._data),
          'utf8',
        );
        return true;
      } catch (err) {
        throw new Error(
          `Appium could not write to manifest at ${this._manifestPath} using APPIUM_HOME ${this._appiumHome}. ` +
            `Please ensure it is writable. Original error: ${err.message}`,
        );
      }
    })();
    try {
      return await this._writing;
    } finally {
      this._writing = undefined;
    }
  }
}

/**
 * Either `driver` or `plugin` rn
 * @typedef {typeof DRIVER_TYPE | typeof PLUGIN_TYPE} ExtensionType
 */

/**
 * Represents an entire YAML manifest (`extensions.yaml`)
 * @typedef {Object} ManifestData
 * @property {ExtRecord<DriverType>} drivers - Record of drivers, keyed by name
 * @property {ExtRecord<PluginType>} plugins - Record of plugins, keyed by name
 * @property {number} [schemaRev] - The schema revision of the manifest
 */

/**
 * Combination of external + internal extension data with `driverName`/`pluginName` removed (it becomes a key in an {@link ExtRecord} object).
 * @template {ExtensionType} ExtType
 * @typedef {(Omit<ExternalData<ExtType>, ExtType extends DriverType ? 'driverName' : 'pluginName'>) & InternalData & CommonData} ExtensionManifest
 */

/**
 * Manifest extension data which is _not_ provided in `package.json`.  It may be derived
 * (e.g., `installSpec`) or copied from elsewhere in a `package.json` (e.g.,
 * `version`).
 * @typedef {Object} InternalData
 * @property {string} pkgName - Name of package (e.g., `appium-xcuitest-driver`)
 * @property {string} version - Version of package
 * @property {import('./extension-config').InstallType} installType - Install type
 * @property {string} installSpec - Whatever the user typed as the extension to install. May be derived from `package.json`
 */

/**
 * Convert external (`package.json`) extension data into manifest data
 * @typedef {ExtensionManifest<DriverType>} ManifestDriverData
 */

/**
 * Convert external (`package.json`) extension data into manifest data
 * @typedef {ExtensionManifest<PluginType>} ManifestPluginData
 */

/**
 * Data points shared by all Appium extensions
 * @typedef {Object} CommonData
 * @property {string} mainClass - Name of main class in the extension
 * @property {Record<string,string>} [scripts] - Collection of scripts which an extension may run
 * @property {string | (import('ajv').SchemaObject & {[key: number]: never})} [schema] - Argument schema object
 */

/**
 * Driver-specific manifest data.
 * @typedef {Object} DriverData
 * @property {string} automationName - Automation engine to use
 * @property {string[]} platformNames - Platforms to run on
 * @property {string} driverName - Name of driver (_not_ the same as the package name, probably)
 */

/**
 * Plugin-specific manifest data.
 * @typedef {Object} PluginData
 * @property {string} pluginName - Name of plugin (_not_ the same as the package name, probably)
 */

/**
 * Generic type to refer to either {@link DriverData} or {@link PluginData}
 * @template {ExtensionType} ExtType
 * @typedef {CommonData & (ExtType extends DriverType ? DriverData : PluginData)} ExternalData
 */

/**
 * Main class/constructor of third-party plugin
 *
 * Referenced by {@link CommonData.mainClass}
 * @typedef { {pluginName: string} & import('type-fest').Class<unknown> & ExtClassStaticMembers} PluginClass
 */

/**
 * Main class/constructor of third-party driver
 *
 * Referenced by {@link CommonData.mainClass}
 * @typedef { {driverName: string} & import('type-fest').Class<unknown> & ExtClassStaticMembers } DriverClass
 */

/**
 * @typedef {Object} ExtClassStaticMembers
 * @property {UpdateServerFn} [updateServer]
 * @property {import('@appium/base-driver').MethodMap} [newMethodMap]
 */

/**
 * @callback UpdateServerFn
 * @param {import('express').Express} app - Express app
 * @param {import('http').Server} httpServer - HTTP server
 * @returns {import('type-fest').Promisable<void>}
 */
/**
 * Generic type for an object keyed by extension name, with values of type {@link ExtData}
 * @template {ExtensionType} ExtType
 * @typedef {Record<string,ExtData<ExtType>>} ExtRecord
 */

/**
 * Generic type to refer to the data in an {@link ExtRecord}; this is the data for each extension in `extensions.yaml`.
 * @template {ExtensionType} ExtType
 * @typedef {ExtensionManifest<ExtType>} ExtData
 */

/**
 * Like {@link ExtData} except it _for sure_ has a `schema` property.
 * @template {ExtensionType} ExtType
 * @typedef {(ExtensionManifest<ExtType>) & {schema: import('ajv').SchemaObject|string} } ExtDataWithSchema
 */

/**
 * Generic type to refer to the main class constructor of an extension
 * @template {ExtensionType} ExtType
 * @typedef {ExtType extends DriverType ? DriverClass : PluginClass} ExtClass
 */

/**
 * Generic type for the key of an {@link ExtRecord} which corresponds to an extension name.
 * @template {ExtensionType} ExtType
 * @typedef {keyof ExtRecord<ExtType>} ExtName
 */

/**
 * Type of the string referring to a driver (typically as a key or type string)
 * @typedef {typeof import('../constants').DRIVER_TYPE} DriverType
 */

/**
 * Type of the string referring to a plugin (typically as a key or type string)
 * @typedef {typeof import('../constants').PLUGIN_TYPE} PluginType
 */

/**
 * A `package.json` containing extension data.
 * @template {ExtensionType} ExtType
 * @typedef {import('type-fest').SetRequired<import('type-fest').PackageJson, 'name' | 'version'> & {appium: ExternalData<ExtType>} } ExtensionPackageJson
 */

/**
 * @typedef {Object} SyncWithInstalledExtensionsOpts
 * @property {number} [depthLimit] - Maximum depth to recurse into subdirectories
 */
