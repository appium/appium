// @ts-check

import _ from 'lodash';
import log from './logger';
import { node, util } from '@appium/support';
import { errors } from '../protocol/errors';

const MAX_SETTINGS_SIZE = 20 * 1024 * 1024; // 20 MB

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
   * @type {import('@appium/types').SettingsUpdateListener<T>|undefined}
   */
  _onSettingsUpdate;

  /**
   * `onSettingsUpdate` is _required_ if settings will ever be updated; otherwise
   * an error will occur at runtime.
   * @param {T} [defaultSettings]
   * @param {import('@appium/types').SettingsUpdateListener<T>} [onSettingsUpdate]
   */
  constructor (defaultSettings, onSettingsUpdate) {
    this._settings = /** @type {T} */({...(defaultSettings ?? {})});
    this._onSettingsUpdate = onSettingsUpdate;
  }

  /**
   * calls updateSettings from implementing driver every time a setting is changed.
   * @param {T} newSettings
   */
  async update (newSettings) {
    if (!_.isPlainObject(newSettings)) {
      throw new errors.InvalidArgumentError(`Settings update should be called with valid JSON. Got ` +
        `${JSON.stringify(newSettings)} instead`);
    }

    if (node.getObjectSize({...this._settings, ...newSettings}) >= MAX_SETTINGS_SIZE) {
      throw new errors.InvalidArgumentError(`New settings cannot be applied, because the overall ` +
        `object size exceeds the allowed limit of ${util.toReadableSizeString(MAX_SETTINGS_SIZE)}`);
    }

    if (!_.isFunction(this._onSettingsUpdate)) {
      log.errorAndThrow(`Unable to update settings; ` +
      `onSettingsUpdate method not found on '${this.constructor.name}'`);
      return;
    }

    const props = /** @type {(keyof T & string)[]} */(_.keys(newSettings));
    for (const prop of props) {
      if (!_.isUndefined(this._settings[prop])) {
        if (this._settings[prop] === newSettings[prop]) {
          log.debug(`The value of '${prop}' setting did not change. Skipping the update for it`);
          continue;
        }
      }
      // update setting only when there is updateSettings defined.
      await this._onSettingsUpdate(prop, newSettings[prop], this._settings[prop]);
      this._settings[prop] = newSettings[prop];
    }
  }

  getSettings () {
    return this._settings;
  }
}

export default DeviceSettings;
export { DeviceSettings };

/**
 * @template T
 * @typedef {import('@appium/types').DeviceSettings<T>} IDeviceSettings
 */
