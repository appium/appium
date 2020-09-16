import _ from 'lodash';
import ExtensionCommand from './extension-command';
import {PLUGIN_TYPE} from '../extension-config';
import {KNOWN_PLUGINS} from '../plugins';

const REQ_PLUGIN_FIELDS = ['pluginName', 'mainClass'];

export default class PluginCommand extends ExtensionCommand {

  constructor ({config, json}) {
    super({config, json, type: PLUGIN_TYPE});
    this.knownExtensions = KNOWN_PLUGINS;
  }

  async install ({plugin, installType, packageName}) {
    return await super.install({ext: plugin, installType, packageName});
  }

  async uninstall ({plugin}) {
    return await super.uninstall({ext: plugin});
  }

  async update ({plugin, unsafe}) {
    return await super.update({ext: plugin, unsafe});
  }

  getPostInstallText ({extName, extData}) {
    return `Plugin ${extName}@${extData.version} successfully installed`.green;
  }

  validateExtensionFields (appiumPkgData) {
    const missingFields = REQ_PLUGIN_FIELDS.reduce((acc, field) => (
      appiumPkgData[field] ? acc : [...acc, field]
    ), []);

    if (!_.isEmpty(missingFields)) {
      throw new Error('Installed plugin did not expose correct fields for compability ' +
                      `with Appium. Missing fields: ${JSON.stringify(missingFields)}`);
    }

  }

}
