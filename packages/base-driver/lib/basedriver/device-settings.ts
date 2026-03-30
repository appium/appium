import _ from 'lodash';
import {log} from './logger';
import {node, util} from '@appium/support';
import {errors} from '../protocol/errors';
import type {StringRecord, IDeviceSettings, SettingsUpdateListener} from '@appium/types';

/**
 * Maximum size (in bytes) of a given driver's settings object (which is internal to {@linkcode DeviceSettings}).
 */
export const MAX_SETTINGS_SIZE = 20 * 1024 * 1024; // 20 MB

/**
 * @template T - Settings object shape (string-keyed record)
 */
export class DeviceSettings<T extends StringRecord = StringRecord> implements IDeviceSettings<T> {
  protected _settings: T;
  protected _onSettingsUpdate: SettingsUpdateListener<T>;

  /**
   * Creates a _shallow copy_ of the `defaultSettings` parameter!
   *
   * @param defaultSettings - Initial settings (shallow-copied).
   * @param onSettingsUpdate - Called when a setting is changed; receives (prop, newValue, curValue).
   */
  constructor(
    defaultSettings: T = {} as T,
    onSettingsUpdate: SettingsUpdateListener<T> = async () => {}
  ) {
    this._settings = {...defaultSettings};
    this._onSettingsUpdate = onSettingsUpdate;
  }

  /**
   * Calls updateSettings from implementing driver every time a setting is changed.
   *
   * @param newSettings - New settings to merge (must be plain object; total size remains bounded).
   */
  async update(newSettings: T): Promise<void> {
    if (!_.isPlainObject(newSettings)) {
      throw new errors.InvalidArgumentError(
        `Settings update should be called with valid JSON. Got ` +
          `${JSON.stringify(newSettings)} instead`
      );
    }

    if (node.getObjectSize({...this._settings, ...newSettings}) >= MAX_SETTINGS_SIZE) {
      throw new errors.InvalidArgumentError(
        `New settings cannot be applied, because the overall ` +
          `object size exceeds the allowed limit of ${util.toReadableSizeString(MAX_SETTINGS_SIZE)}`
      );
    }

    for (const prop in newSettings) {
      if (!_.isUndefined(this._settings[prop])) {
        if (this._settings[prop] === newSettings[prop]) {
          log.debug(`The value of '${prop}' setting did not change. Skipping the update for it`);
          continue;
        }
      }
      await this._onSettingsUpdate(
        prop as keyof T,
        newSettings[prop],
        this._settings[prop]
      );
      this._settings[prop] = newSettings[prop];
    }
  }

  getSettings(): T {
    return this._settings;
  }
}
