import _ from 'lodash';
import ExtensionCommand from './extension-command';
import { KNOWN_PLUGINS } from '../constants';

const REQ_PLUGIN_FIELDS = ['pluginName', 'mainClass'];

export default class PluginCommand extends ExtensionCommand {

  /**
   *
   * @param {PluginCommandOptions} opts
   */
  constructor ({config, json}) {
    super({config, json});
    this.knownExtensions = KNOWN_PLUGINS;
  }

  async install ({plugin, installType, packageName}) {
    return await super._install({ext: plugin, installType, packageName});
  }

  async uninstall ({plugin}) {
    return await super._uninstall({ext: plugin});
  }

  async update ({plugin, unsafe}) {
    return await super._update({ext: plugin, unsafe});
  }

  async run ({plugin, scriptName}) {
    return await super._run({ext: plugin, scriptName});
  }

  getPostInstallText ({extName, extData}) {
    return `Plugin ${extName}@${extData.version} successfully installed`.green;
  }

  validateExtensionFields (appiumPkgData) {
    const missingFields = REQ_PLUGIN_FIELDS.reduce((acc, field) => (
      appiumPkgData[field] ? acc : [...acc, field]
    ), []);

    if (!_.isEmpty(missingFields)) {
      throw new Error(`Installed plugin did not expose correct fields for compability ` +
                      `with Appium. Missing fields: ${JSON.stringify(missingFields)}`);
    }

  }

}

/**
 * @typedef PluginCommandOptions
 * @property {import('../extension/extension-config').ExtensionConfig<import('../extension/manifest').PluginType>} config
 * @property {boolean} json
 */
