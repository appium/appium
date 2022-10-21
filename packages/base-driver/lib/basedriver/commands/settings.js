// @ts-check

/**
 * @template {Constraints} C
 * @param {import('./log').LogBase<C>} Base
 * @returns {SettingsBase<C>}
 */
export function SettingsMixin(Base) {
  /**
   * @implements {ISettingsCommands}
   */
  class SettingsCommands extends Base {
    async updateSettings(newSettings) {
      if (!this.settings) {
        this.log.errorAndThrow('Cannot update settings; settings object not found');
      }
      return await this.settings.update(newSettings);
    }

    async getSettings() {
      if (!this.settings) {
        this.log.errorAndThrow('Cannot get settings; settings object not found');
      }
      return await this.settings.getSettings();
    }
  }

  return SettingsCommands;
}

/**
 * @typedef {import('@appium/types').Constraints} Constraints
 * @typedef {import('@appium/types').ISettingsCommands} ISettingsCommands
 */
/**
 * @template {Constraints} C
 * @typedef {import('../driver').BaseDriverBase<C, import('@appium/types').ITimeoutCommands & import('@appium/types').IEventCommands & import('@appium/types').IFindCommands & import('@appium/types').ILogCommands<C> & ISettingsCommands>} SettingsBase
 */
