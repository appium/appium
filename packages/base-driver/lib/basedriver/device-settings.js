import _ from 'lodash';
import log from './logger';
import { node, util } from '@appium/support';
import { errors } from '../protocol/errors';

const MAX_SETTINGS_SIZE = 20 * 1024 * 1024; // 20 MB

class DeviceSettings {

  constructor (defaultSettings = {}, onSettingsUpdate = null) {
    this._settings = Object.assign({}, defaultSettings);
    this.onSettingsUpdate = onSettingsUpdate;
  }

  // calls updateSettings from implementing driver every time a setting is changed.
  async update (newSettings) {
    if (!_.isPlainObject(newSettings)) {
      throw new errors.InvalidArgumentError(`Settings update should be called with valid JSON. Got ` +
        `${JSON.stringify(newSettings)} instead`);
    }
    if (node.getObjectSize({...this._settings, ...newSettings}) >= MAX_SETTINGS_SIZE) {
      throw new errors.InvalidArgumentError(`New settings cannot be applied, because the overall ` +
        `object size exceeds the allowed limit of ${util.toReadableSizeString(MAX_SETTINGS_SIZE)}`);
    }

    for (const prop of _.keys(newSettings)) {
      if (!_.isUndefined(this._settings[prop])) {
        if (this._settings[prop] === newSettings[prop]) {
          log.debug(`The value of '${prop}' setting did not change. Skipping the update for it`);
          continue;
        }
      }
      // update setting only when there is updateSettings defined.
      if (_.isFunction(this.onSettingsUpdate)) {
        await this.onSettingsUpdate(prop, newSettings[prop], this._settings[prop]);
        this._settings[prop] = newSettings[prop];
      } else {
        log.errorAndThrow(`Unable to update settings; ` +
          `onSettingsUpdate method not found on '${this.constructor.name}'`);
      }
    }
  }

  getSettings () {
    return this._settings;
  }
}

export default DeviceSettings;
export { DeviceSettings };
