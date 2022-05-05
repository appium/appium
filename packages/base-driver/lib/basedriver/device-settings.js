// @ts-check

import _ from 'lodash';
import log from './logger';
import {node, util} from '@appium/support';
import {errors} from '../protocol/errors';

/**
 * Maximum size (in bytes) of a given driver's settings object (which is internal to {@linkcode DriverSettings}).
 */
export const MAX_SETTINGS_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * @template {Record<string,unknown>} T
 * @implements {IDeviceSettings<T>}
 */
class DeviceSettings {
  /**
   * @protected
   * @type {T}
   */
  _settings;

  /**
   * @protected
   * @type {import('@appium/types').SettingsUpdateListener<T>}
   */
  _onSettingsUpdate;

  /**
   * Creates a _shallow copy_ of the `defaultSettings` parameter!
   * @param {T} [defaultSettings]
   * @param {import('@appium/types').SettingsUpdateListener<T>} [onSettingsUpdate]
   */
  constructor(defaultSettings, onSettingsUpdate) {
    this._settings = /** @type {T} */ ({...(defaultSettings ?? {})});
    this._onSettingsUpdate = onSettingsUpdate ?? (async () => {});
  }

  /**
   * calls updateSettings from implementing driver every time a setting is changed.
   * @param {T} newSettings
   */
  async update(newSettings) {
    if (!_.isPlainObject(newSettings)) {
      throw new errors.InvalidArgumentError(
        `Settings update should be called with valid JSON. Got ` +
          `${JSON.stringify(newSettings)} instead`
      );
    }

    if (
      node.getObjectSize({...this._settings, ...newSettings}) >=
      MAX_SETTINGS_SIZE
    ) {
      throw new errors.InvalidArgumentError(
        `New settings cannot be applied, because the overall ` +
          `object size exceeds the allowed limit of ${util.toReadableSizeString(
            MAX_SETTINGS_SIZE
          )}`
      );
    }

    const props = /** @type {(keyof T & string)[]} */ (_.keys(newSettings));
    for (const prop of props) {
      if (!_.isUndefined(this._settings[prop])) {
        if (this._settings[prop] === newSettings[prop]) {
          log.debug(
            `The value of '${prop}' setting did not change. Skipping the update for it`
          );
          continue;
        }
      }
      await this._onSettingsUpdate(
        prop,
        newSettings[prop],
        this._settings[prop]
      );
      this._settings[prop] = newSettings[prop];
    }
  }

  getSettings() {
    return this._settings;
  }
}

export default DeviceSettings;
export {DeviceSettings};

/**
 * @template T
 * @typedef {import('@appium/types').DeviceSettings<T>} IDeviceSettings
 */
