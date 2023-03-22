import {BaseDriver} from '../driver';
import {Constraints, ISettingsCommands, StringRecord} from '@appium/types';
import {mixin} from './mixin';

declare module '../driver' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface BaseDriver<C extends Constraints> extends ISettingsCommands {}
}

const SettingsCommands: ISettingsCommands = {
  async updateSettings<C extends Constraints>(this: BaseDriver<C>, newSettings: StringRecord) {
    if (!this.settings) {
      this.log.errorAndThrow('Cannot update settings; settings object not found');
    }
    return await this.settings.update(newSettings);
  },

  async getSettings<C extends Constraints>(this: BaseDriver<C>) {
    if (!this.settings) {
      this.log.errorAndThrow('Cannot get settings; settings object not found');
    }
    return this.settings.getSettings();
  },
};

mixin(SettingsCommands);
