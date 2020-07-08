import ExtensionConfig, { PLUGIN_TYPE } from './extension-config';

export default class PluginConfig extends ExtensionConfig {
  constructor (appiumHome, logFn = null) {
    super(appiumHome, PLUGIN_TYPE, logFn);
  }

  extensionDesc (pluginName, {version}) {
    return `${pluginName}@${version}`;
  }
}

