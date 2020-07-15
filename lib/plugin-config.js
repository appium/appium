import _ from 'lodash';
import ExtensionConfig, { PLUGIN_TYPE } from './extension-config';
import log from './logger';

export default class PluginConfig extends ExtensionConfig {
  constructor (appiumHome, logFn = null) {
    super(appiumHome, PLUGIN_TYPE, logFn);
  }

  extensionDesc (pluginName, {version}) {
    return `${pluginName}@${version}`;
  }

  print (activePlugins) {
    const pluginNames = Object.keys(this.installedExtensions);
    const activeNames = activePlugins.map((p) => p.name);

    if (_.isEmpty(pluginNames)) {
      log.info(`No plugins have been installed. Use the "appium plugin" ` +
               'command to install the one(s) you want to use.');
      return;
    }

    log.info(`Available plugins:`);
    for (const [pluginName, pluginData] of _.toPairs(this.installedExtensions)) {
      const activeTxt = _.includes(activeNames, pluginName) ? ' (ACTIVE)' : '';
      log.info(`  - ${this.extensionDesc(pluginName, pluginData)}${activeTxt}`);
    }

    if (_.isEmpty(activePlugins)) {
      log.info('No plugins activated. Use the --plugins flag with names of plugins to activate');
    }
  }
}
