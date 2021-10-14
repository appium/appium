// @ts-check

/**
 * Module containing {@link ExtConfigIO} which handles reading & writing of extension config files.
 */

import _ from 'lodash';
import {fs, mkdirp} from '@appium/support';
import path from 'path';
import YAML from 'yaml';

const CONFIG_FILE_NAME = 'extensions.yaml';

/**
 * Current configuration schema revision!
 */
const CONFIG_SCHEMA_REV = 2;

/**
 * This schema revision adds the `plugins` property.
 *
 * See {@link ExtConfigIO._applySchemaMigrations} for more details.
 */
const CONFIG_SCHEMA_REV_2 = 2;

export const DRIVER_TYPE = 'driver';
export const PLUGIN_TYPE = 'plugin';

const VALID_EXT_TYPES = new Set([DRIVER_TYPE, PLUGIN_TYPE]);

const CONFIG_DATA_DRIVER_KEY = `${DRIVER_TYPE}s`;
const CONFIG_DATA_PLUGIN_KEY = `${PLUGIN_TYPE}s`;

/**
 * Handles reading & writing of extension config files.
 *
 * Only one instance of this class exists per value of `APPIUM_HOME`.
 */
class ExtConfigIO {
  /**
   * "Dirty" flag. If true, the data has changed since the last write.
   * @type {boolean}
   * @private
   */
  _dirty;
  /**
   * The entire contents of a parsed YAML extension config file.
   * @type {object?}
   * @private
   */
  _data;

  /**
   * A mapping of extension type to configuration data. Configuration data is keyed on extension name.
   *
   * Consumers get the values of this `Map` and do not have access to the entire data object.
   * @type {Map<'driver'|'plugin',object>}
   * @private
   */
  _extensionTypeData = new Map();

  /**
   * Path to config file.
   * @type {Readonly<string>}
   */
  _filepath;

  /**
   * Path to `APPIUM_HOME`
   * @type {Readonly<string>}
   */
  _appiumHome;

  /**
   * Helps avoid writing multiple times.
   * @type {Promise<boolean>?}
   */
  _writing;

  /**
   * Helps avoid reading multiple times.
   * @type {Promise<void>?}
   */
  _reading;

  /**
   * @param {string} appiumHome
   */
  constructor (appiumHome) {
    this._filepath = path.resolve(appiumHome, CONFIG_FILE_NAME);
    this._appiumHome = appiumHome;
  }

  /**
   * Creaes a proxy which watches for changes to the extension-type-specific config data.
   * @param {'driver'|'plugin'} extensionType
   * @param {Record<string,object>} data - Extension config data, keyed by name
   * @private
   * @returns {Record<string,object>}
   */
  _createProxy (extensionType, data) {
    return new Proxy(data[`${extensionType}s`], {
      set: (target, prop, value) => {
        if (value !== target[prop]) {
          this._dirty = true;
        }
        target[prop] = value;
        return Reflect.set(target, prop, value);
      },
      deleteProperty: (target, prop) => {
        if (prop in target) {
          this._dirty = true;
        }
        return Reflect.deleteProperty(target, prop);
      },
    });
  }

  /**
   * Returns the path to the config file.  This value is intended to be read-only.
   */
  get filepath () {
    return this._filepath;
  }

  /**
   * Gets data for an extension type.  Reads the config file if necessary.
   *
   * Force-reading is _not_ supported, as it's likely to be a source of
   * bugs--it's easy to mutate the data and then overwrite memory with the file
   * contents
   * @param {'driver'|'plugin'} extensionType - Which bit of the config data we
   * want
   * @returns {Promise<object>} The data
   */
  async read (extensionType) {
    if (this._reading) {
      await this._reading;
      return this._extensionTypeData.get(extensionType);
    }

    this._reading = (async () => {
      if (!VALID_EXT_TYPES.has(extensionType)) {
        throw new TypeError(
          `Invalid extension type: ${extensionType}. Valid values are: ${[
            ...VALID_EXT_TYPES,
          ].join(', ')}`,
        );
      }
      if (this._extensionTypeData.has(extensionType)) {
        return;
      }

      let data;
      let isNewFile = false;
      try {
        await mkdirp(this._appiumHome);
        const yaml = await fs.readFile(this.filepath, 'utf8');
        data = this._applySchemaMigrations(YAML.parse(yaml));
      } catch (err) {
        if (err.code === 'ENOENT') {
          data = {
            [CONFIG_DATA_DRIVER_KEY]: {},
            [CONFIG_DATA_PLUGIN_KEY]: {},
            schemaRev: CONFIG_SCHEMA_REV,
          };
          isNewFile = true;
        } else {
          throw new Error(
            `Appium had trouble loading the extension installation ` +
              `cache file (${this.filepath}). Ensure it exists and is ` +
              `readable. Specific error: ${err.message}`,
          );
        }
      }

      this._data = data;
      this._extensionTypeData.set(
        DRIVER_TYPE,
        this._createProxy(DRIVER_TYPE, data),
      );
      this._extensionTypeData.set(
        PLUGIN_TYPE,
        this._createProxy(PLUGIN_TYPE, data),
      );

      if (isNewFile) {
        await this.write(true);
      }
    })();
    try {
      await this._reading;
      return this._extensionTypeData.get(extensionType);
    } finally {
      this._reading = null;
    }
  }

  /**
   * Writes the data if it needs writing.
   *
   * If the `schemaRev` prop needs updating, the file will be written.
   * @param {boolean} [force=false] - Whether to force a write even if the data is clean
   * @returns {Promise<boolean>} Whether the data was written
   */
  async write (force = false) {
    if (this._writing) {
      return this._writing;
    }
    this._writing = (async () => {
      try {
        if (!this._dirty && !force) {
          return false;
        }

        if (!this._data) {
          throw new ReferenceError('No data to write. Call `read()` first');
        }

        const dataToWrite = {
          ...this._data,
          [CONFIG_DATA_DRIVER_KEY]: this._extensionTypeData.get(DRIVER_TYPE),
          [CONFIG_DATA_PLUGIN_KEY]: this._extensionTypeData.get(PLUGIN_TYPE),
        };

        try {
          await fs.writeFile(this.filepath, YAML.stringify(dataToWrite), 'utf8');
          this._dirty = false;
          return true;
        } catch {
          throw new Error(
            `Appium could not parse or write from the Appium Home directory ` +
              `(${this._appiumHome}). Please ensure it is writable.`,
          );
        }
      } finally {
        this._writing = null;
      }
    })();
    return await this._writing;
  }

  /**
   * Normalizes the file, even if it was created with `schemaRev` < {@link CONFIG_SCHEMA_REV_2}.
   * At {@link CONFIG_SCHEMA_REV_2}, we started including plugins as well as drivers in the file,
   * so make sure we at least have an empty section for it.
   *
   * Returns a shallow copy of `yamlData`.
   * @param {Readonly<object>} yamlData - Parsed contents of YAML `extensions.yaml`
   * @private
   * @returns {object} A shallow copy of `yamlData`
   */
  _applySchemaMigrations (yamlData) {
    if (
      yamlData.schemaRev < CONFIG_SCHEMA_REV_2 &&
      yamlData[CONFIG_DATA_PLUGIN_KEY] === undefined
    ) {
      this._dirty = true;
      return {
        ...yamlData,
        [CONFIG_DATA_PLUGIN_KEY]: {},
        schemaRev: CONFIG_SCHEMA_REV,
      };
    }
    return {...yamlData};
  }
}

/**
 * Factory function for {@link ExtConfigIO}.
 *
 * Maintains one instance per value of `APPIUM_HOME`.
 * @param {string} appiumHome - `APPIUM_HOME`
 * @returns {ExtConfigIO}
 */
export const getExtConfigIOInstance = _.memoize(
  (appiumHome) => new ExtConfigIO(appiumHome),
);

/**
 * @typedef {ExtConfigIO} ExtensionConfigIO
 */

/**
 * @typedef {typeof DRIVER_TYPE | typeof PLUGIN_TYPE} ExtensionType
 */
