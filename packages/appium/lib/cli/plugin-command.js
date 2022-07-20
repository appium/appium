import _ from 'lodash';
import ExtensionCommand from './extension-command';
import {KNOWN_PLUGINS} from '../constants';

const REQ_PLUGIN_FIELDS = ['pluginName', 'mainClass'];

/**
 * @extends {ExtensionCommand<PluginType>}
 */
export default class PluginCommand extends ExtensionCommand {
  /**
   *
   * @param {import('./extension-command').ExtensionCommandOptions<PluginType>} opts
   */
  constructor({config, json}) {
    super({config, json});
    this.knownExtensions = KNOWN_PLUGINS;
  }

  async install({plugin, installType, packageName}) {
    return await super._install({
      installSpec: plugin,
      installType,
      packageName,
    });
  }

  async uninstall({plugin}) {
    return await super._uninstall({installSpec: plugin});
  }

  async update({plugin, unsafe}) {
    return await super._update({installSpec: plugin, unsafe});
  }

  async run({plugin, scriptName, extraArgs}) {
    return await super._run({installSpec: plugin, scriptName, extraArgs});
  }

  getPostInstallText({extName, extData}) {
    return `Plugin ${extName}@${extData.version} successfully installed`.green;
  }

  /**
   * Validates fields in `appium` field of `driverMetadata`
   *
   * For any `package.json` fields which a driver requires, validate the type of
   * those fields on the `package.json` data, throwing an error if anything is
   * amiss.
   * @param {import('appium/types').ExtMetadata<PluginType>} pluginMetadata
   * @param {string} installSpec
   * @returns {void}
   */
  validateExtensionFields(pluginMetadata, installSpec) {
    const missingFields = REQ_PLUGIN_FIELDS.reduce(
      (acc, field) => (pluginMetadata[field] ? acc : [...acc, field]),
      []
    );

    if (!_.isEmpty(missingFields)) {
      throw new Error(
        `Installed plugin "${installSpec}" did not expose correct fields for compability ` +
          `with Appium. Missing fields: ${JSON.stringify(missingFields)}`
      );
    }
  }
}

/**
 * @typedef {import('@appium/types').PluginType} PluginType
 */
