import {node, util} from '@appium/support';
import type {IDeviceSettings, SettingsUpdateListener, StringRecord} from '@appium/types';

import {log} from '../helpers/logger.js';
import {errors} from '../protocol/errors.js';

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
  constructor(defaultSettings: T = {} as T, onSettingsUpdate: SettingsUpdateListener<T> = async () => {}) {
    this._settings = {...defaultSettings};
    this._onSettingsUpdate = onSettingsUpdate;
  }

  /**
   * Calls updateSettings from implementing driver every time a setting is changed.
   *
   * @param newSettings - New settings to merge (must be plain object; total size remains bounded).
   */
  async update(newSettings: T): Promise<void> {
    if (!util.isPlainObject(newSettings)) {
      throw new errors.InvalidArgumentError(
        `Settings update should be called with valid JSON. Got ` + `${JSON.stringify(newSettings)} instead`,
      );
    }

    // every key is validated up front so a rejected update is all-or-nothing:
    // no part of the payload reaches the listener or the store. An own
    // `__proto__` key (e.g. from JSON.parse) is the only hazard - assigning it
    // rewrites the prototype of the settings object itself, while
    // `constructor`/`prototype` as own keys are plain data properties
    const keys = Object.keys(newSettings);
    if (keys.includes('__proto__')) {
      throw new errors.InvalidArgumentError(
        `Settings updates must not use the '__proto__' key, because assigning it would rewrite the prototype of the settings object`,
      );
    }

    if (node.getObjectSize({...this._settings, ...newSettings}) >= MAX_SETTINGS_SIZE) {
      throw new errors.InvalidArgumentError(
        `New settings cannot be applied, because the overall ` +
          `object size exceeds the allowed limit of ${util.toReadableSizeString(MAX_SETTINGS_SIZE)}`,
      );
    }

    for (const prop of keys) {
      if (this._settings[prop] !== undefined) {
        if (this._settings[prop] === newSettings[prop]) {
          log.debug(`The value of '${prop}' setting did not change. Skipping the update for it`);
          continue;
        }
      }
      await this._onSettingsUpdate(prop as keyof T, newSettings[prop], this._settings[prop]);
      (this._settings as Record<string, unknown>)[prop] = newSettings[prop];
    }
  }

  getSettings(): T {
    return this._settings;
  }
}
