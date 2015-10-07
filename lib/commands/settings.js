import log from '../logger';

let commands = {};

commands.updateSettings = async function (newSettings) {
  if (!this.settings) {
    log.errorAndThrow('Cannot update settings; settings object not found');
  }
  return this.settings.update(newSettings);
};

commands.getSettings = async function () {
  if (!this.settings) {
    log.errorAndThrow('Cannot get settings; settings object not found');
  }
  return this.settings.getSettings();
};

export default commands;
