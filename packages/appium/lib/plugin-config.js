import _ from 'lodash';
import ExtensionConfig from './extension-config';
import { PLUGIN_TYPE } from './ext-config-io';
import log from './logger';

export default class PluginConfig extends ExtensionConfig {
  constructor (appiumHome, logFn = null) {
    super(appiumHome, PLUGIN_TYPE, logFn);
  }

  extensionDesc (pluginName, {version}) {
    return `${pluginName}@${version}`;
  }

  print (activeNames) {
    const pluginNames = Object.keys(this.installedExtensions);

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

    if (_.isEmpty(activeNames)) {
      log.info('No plugins activated. Use the --plugins flag with names of plugins to activate');
    }
  }
}
