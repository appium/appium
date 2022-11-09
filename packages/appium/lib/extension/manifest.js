/**
 * Module containing {@link Manifest} which handles reading & writing of extension config files.
 */

import B from 'bluebird';
import glob from 'glob';
import {env, fs} from '@appium/support';
import _ from 'lodash';
import path from 'path';
import YAML from 'yaml';
import {CURRENT_SCHEMA_REV, DRIVER_TYPE, PLUGIN_TYPE} from '../constants';
import log from '../logger';
import {INSTALL_TYPE_NPM} from './extension-config';
import {packageDidChange} from './package-changed';
import {migrate} from './manifest-migrations';

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
  schemaRev: CURRENT_SCHEMA_REV,
});

/**
 * Given a `package.json` return `true` if it represents an Appium Extension (either a driver or plugin).
 *
 * The `package.json` must have an `appium` property which is an object.
 * @param {any} value
 * @returns {value is ExtPackageJson<ExtensionType>}
 */
function isExtension(value) {
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
 * @returns {value is ExtPackageJson<DriverType>}
 */
function isDriver(value) {
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
 * @returns {value is ExtPackageJson<PluginType>}
 */
function isPlugin(value) {
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
   */
  #data;

  /**
   * Path to `APPIUM_HOME`.
   * @type {Readonly<string>}
   */
  #appiumHome;

  /**
   * Path to `extensions.yaml`
   * @type {string}
   * Not set until {@link Manifest.read} is called.
   */
  #manifestPath;

  /**
   * Helps avoid writing multiple times.
   *
   * If this is `undefined`, calling {@link Manifest.write} will cause it to be
   * set to a `Promise`. When the call to `write()` is complete, the `Promise`
   * will resolve and then this value will be set to `undefined`.  Concurrent calls
   * made while this value is a `Promise` will return the `Promise` itself.
   * @type {Promise<boolean>|undefined}
   */
  #writing;

  /**
   * Helps avoid reading multiple times.
   *
   * If this is `undefined`, calling {@link Manifest.read} will cause it to be
   * set to a `Promise`. When the call to `read()` is complete, the `Promise`
   * will resolve and then this value will be set to `undefined`.  Concurrent calls
   * made while this value is a `Promise` will return the `Promise` itself.
   * @type {Promise<void>|undefined}
   */
  #reading;

  /**
   * Sets internal data to a fresh clone of {@link INITIAL_MANIFEST_DATA}
   *
   * Use {@link Manifest.getInstance} instead.
   * @param {string} appiumHome
   * @private
   */
  constructor(appiumHome) {
    this.#appiumHome = appiumHome;
    this.#data = _.cloneDeep(INITIAL_MANIFEST_DATA);
  }

  /**
   * Returns a new or existing {@link Manifest} instance, based on the value of `appiumHome`.
   *
   * Maintains one instance per value of `appiumHome`.
   * @param {string} appiumHome - Path to `APPIUM_HOME`
   * @returns {Manifest}
   */
  static getInstance = _.memoize(function _getInstance(appiumHome) {
    return new Manifest(appiumHome);
  });

  /**
   * Searches `APPIUM_HOME` for installed extensions and adds them to the manifest.
   * @returns {Promise<boolean>} `true` if any extensions were added, `false` otherwise.
   */
  async syncWithInstalledExtensions() {
    // this could be parallelized, but we can't use fs.walk as an async iterator
    let didChange = false;

    /**
     * Listener for the `match` event of a `glob` instance
     * @param {string} filepath - Path to a `package.json`
     * @returns {Promise<void>}
     */
    const onMatch = async (filepath) => {
      try {
        const pkg = JSON.parse(await fs.readFile(filepath, 'utf8'));
        if (isDriver(pkg) || isPlugin(pkg)) {
          const changed = this.addExtensionFromPackage(pkg, filepath);
          didChange = didChange || changed;
        }
      } catch {}
    };

    /**
     * A list of `Promise`s which read `package.json` files looking for Appium extensions.
     * @type {Promise<void>[]}
     */
    const queue = [
      // look at `package.json` in `APPIUM_HOME` only
      onMatch(path.join(this.#appiumHome, 'package.json')),
    ];

    // add dependencies to the queue
    await new B((resolve, reject) => {
      glob(
        'node_modules/{*,@*/*}/package.json',
        {cwd: this.#appiumHome, silent: true, absolute: true},
        // eslint-disable-next-line promise/prefer-await-to-callbacks
        (err) => {
          if (err) {
            reject(err);
          }
          resolve();
        }
      )
        .on('error', reject)
        .on('match', (filepath) => {
          queue.push(onMatch(filepath));
        });
    });

    // wait for everything to finish
    await B.all(queue);

    return didChange;
  }

  /**
   * Returns `true` if driver with name `name` is registered.
   * @param {string} name - Driver name
   * @returns {boolean}
   */
  hasDriver(name) {
    return Boolean(this.#data.drivers[name]);
  }

  /**
   * Returns `true` if plugin with name `name` is registered.
   * @param {string} name - Plugin name
   * @returns {boolean}
   */
  hasPlugin(name) {
    return Boolean(this.#data.plugins[name]);
  }

  /**
   * Given a path to a `package.json`, add it as either a driver or plugin to the manifest.
   *
   * Will _not_ overwrite existing entries.
   * @template {ExtensionType} ExtType
   * @param {ExtPackageJson<ExtType>} pkgJson
   * @param {string} pkgPath
   * @returns {boolean} - `true` upon success, `false` if the extension is already registered.
   */
  addExtensionFromPackage(pkgJson, pkgPath) {
    const extensionPath = path.dirname(pkgPath);

    /**
     * @type {InternalMetadata}
     */
    const internal = {
      pkgName: pkgJson.name,
      version: pkgJson.version,
      appiumVersion: pkgJson.peerDependencies?.appium,
      installType: INSTALL_TYPE_NPM,
      installSpec: `${pkgJson.name}@${pkgJson.version}`,
      installPath: extensionPath,
    };

    if (isDriver(pkgJson)) {
      if (!this.hasDriver(pkgJson.appium.driverName)) {
        this.addExtension(DRIVER_TYPE, pkgJson.appium.driverName, {
          ..._.omit(pkgJson.appium, 'driverName'),
          ...internal,
        });
        return true;
      }
      return false;
    } else if (isPlugin(pkgJson)) {
      if (!this.hasPlugin(pkgJson.appium.pluginName)) {
        this.addExtension(PLUGIN_TYPE, pkgJson.appium.pluginName, {
          ..._.omit(pkgJson.appium, 'pluginName'),
          ...internal,
        });
        return true;
      }
      return false;
    } else {
      throw new TypeError(
        `The extension in ${extensionPath} is neither a valid driver nor a valid plugin.`
      );
    }
  }

  /**
   * Adds an extension to the manifest as was installed by the `appium` CLI.  The
   * `extData`, `extType`, and `extName` have already been determined.
   *
   * See {@link Manifest.addExtensionFromPackage} for adding an extension from an on-disk package.
   * @template {ExtensionType} ExtType
   * @param {ExtType} extType - `driver` or `plugin`
   * @param {string} extName - Name of extension
   * @param {ExtManifest<ExtType>} extData - Extension metadata
   * @returns {ExtManifest<ExtType>} A clone of `extData`, potentially with a mutated `appiumVersion` field
   */
  addExtension(extType, extName, extData) {
    const data = _.clone(extData);
    this.#data[`${extType}s`][extName] = data;
    return data;
  }

  /**
   * Returns the `APPIUM_HOME` path
   */
  get appiumHome() {
    return this.#appiumHome;
  }

  /**
   * Returns the path to the manifest file (`extensions.yaml`)
   */
  get manifestPath() {
    return this.#manifestPath;
  }

  /**
   * Returns extension data for a particular type.
   *
   * @template {ExtensionType} ExtType
   * @param {ExtType} extType
   * @returns {ExtRecord<ExtType>}
   */
  getExtensionData(extType) {
    return this.#data[/** @type {string} */ (`${extType}s`)];
  }

  /**
   * Reads manifest from disk and _overwrites_ the internal data.
   *
   * If the manifest does not exist on disk, an {@link INITIAL_MANIFEST_DATA "empty"} manifest file will be created.
   *
   * If `APPIUM_HOME` contains a `package.json` with an `appium` dependency, then a hash of the `package.json` will be taken. If this hash differs from the last hash, the contents of `APPIUM_HOME/node_modules` will be scanned for extensions that may have been installed outside of the `appium` CLI.  Any found extensions will be added to the manifest file, and if so, the manifest file will be written to disk.
   *
   * Only one read operation should happen at a time.
   * @returns {Promise<ManifestData>} The data
   */
  async read() {
    if (this.#reading) {
      await this.#reading;
      return this.#data;
    }

    this.#reading = (async () => {
      /** @type {ManifestData} */
      let data;
      let isNewFile = false;
      await this.#setManifestPath();
      try {
        log.debug(`Reading ${this.#manifestPath}...`);
        const yaml = await fs.readFile(this.#manifestPath, 'utf8');
        data = YAML.parse(yaml);
        log.debug(`Parsed manifest file: ${JSON.stringify(data, null, 2)}`);
      } catch (err) {
        if (err.code === 'ENOENT') {
          data = _.cloneDeep(INITIAL_MANIFEST_DATA);
          isNewFile = true;
        } else {
          if (this.#manifestPath) {
            throw new Error(
              `Appium had trouble loading the extension installation ` +
                `cache file (${this.#manifestPath}). It may be invalid YAML. Specific error: ${
                  err.message
                }`
            );
          } else {
            throw new Error(
              `Appium encountered an unknown problem. Specific error: ${err.message}`
            );
          }
        }
      }

      this.#data = data;

      let shouldWrite = false;

      if ((data.schemaRev ?? 0) < CURRENT_SCHEMA_REV) {
        log.debug(
          `Updating manifest schema from rev ${data.schemaRev ?? '(none)'} to ${CURRENT_SCHEMA_REV}`
        );
        shouldWrite = await migrate(this, this.#data);
      }

      if (
        shouldWrite ||
        ((await env.hasAppiumDependency(this.appiumHome)) &&
          (await packageDidChange(this.appiumHome)))
      ) {
        shouldWrite = await this.syncWithInstalledExtensions();
      }

      if (isNewFile || shouldWrite) {
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
   * Ensures the internal manifest path is set.
   *
   * Creates the directory if necessary.
   * @returns {Promise<string>}
   */
  async #setManifestPath() {
    if (!this.#manifestPath) {
      this.#manifestPath = await env.resolveManifestPath(this.#appiumHome);

      /* istanbul ignore if */
      if (path.relative(this.#appiumHome, this.#manifestPath).startsWith('.')) {
        throw new Error(
          `Mismatch between location of APPIUM_HOME and manifest file. APPIUM_HOME: ${
            this.appiumHome
          }, manifest file: ${this.#manifestPath}`
        );
      }
    }

    return this.#manifestPath;
  }

  /**
   * Writes the data if it need s writing.
   *
   * If the `schemaRev` prop needs updating, the file will be written.
   *
   * @todo If this becomes too much of a bottleneck, throttle it.
   * @returns {Promise<boolean>} Whether the data was written
   */
  async write() {
    if (this.#writing) {
      return this.#writing;
    }
    this.#writing = (async () => {
      await this.#setManifestPath();
      try {
        await fs.mkdirp(path.dirname(this.#manifestPath));
      } catch (err) {
        throw new Error(
          `Appium could not create the directory for the manifest file: ${path.dirname(
            this.#manifestPath
          )}. Original error: ${err.message}`
        );
      }
      try {
        await fs.writeFile(this.#manifestPath, YAML.stringify(this.#data), 'utf8');
        return true;
      } catch (err) {
        throw new Error(
          `Appium could not write to manifest at ${this.#manifestPath} using APPIUM_HOME ${
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
}

/**
 * Type of the string referring to a driver (typically as a key or type string)
 * @typedef {import('@appium/types').DriverType} DriverType
 */

/**
 * Type of the string referring to a plugin (typically as a key or type string)
 * @typedef {import('@appium/types').PluginType} PluginType
 */

/**
 * @typedef SyncWithInstalledExtensionsOpts
 * @property {number} [depthLimit] - Maximum depth to recurse into subdirectories
 */

/**
 * @typedef {import('appium/types').ManifestData} ManifestData
 * @typedef {import('appium/types').InternalMetadata} InternalMetadata
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {import('appium/types').ExtPackageJson<ExtType>} ExtPackageJson
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {import('appium/types').ExtManifest<ExtType>} ExtManifest
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {import('appium/types').ExtRecord<ExtType>} ExtRecord
 */

/**
 * Either `driver` or `plugin` rn
 * @typedef {import('@appium/types').ExtensionType} ExtensionType
 */
