const commands = {};

commands.updateSettings = async function updateSettings (newSettings) {
  if (!this.settings) {
    this.log.errorAndThrow('Cannot update settings; settings object not found');
  }
  return await this.settings.update(newSettings);
};

commands.getSettings = async function getSettings () {
  if (!this.settings) {
    this.log.errorAndThrow('Cannot get settings; settings object not found');
  }
  return await this.settings.getSettings();
};

export default commands;
