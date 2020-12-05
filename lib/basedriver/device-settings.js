import _ from 'lodash';
import log from './logger';

class DeviceSettings {

  constructor (defaultSettings = {}, onSettingsUpdate = null) {
    this._settings = Object.assign({}, defaultSettings);
    this.onSettingsUpdate = onSettingsUpdate;
  }

  // calls updateSettings from implementing driver every time a setting is changed.
  async update (newSettings) {
    if (!_.isPlainObject(newSettings)) {
      throw new Error(`Settings update should be called with valid JSON. Got ` +
        `${JSON.stringify(newSettings)} instead`);
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
