import _ from 'lodash';
import ExtensionCliCommand from './extension-command';
import {KNOWN_PLUGINS} from '../constants';

const REQ_PLUGIN_FIELDS = ['pluginName', 'mainClass'];

/**
 * @extends {ExtensionCliCommand<PluginType>}
 */
export default class PluginCliCommand extends ExtensionCliCommand {
  /**
   *
   * @param {import('./extension-command').ExtensionCommandOptions<PluginType>} opts
   */
  constructor({config, json}) {
    super({config, json});
    this.knownExtensions = KNOWN_PLUGINS;
  }

  /**
   * Install a plugin
   *
   * @param {PluginInstallOpts} opts
   * @returns {Promise<ExtRecord<PluginType>>}
   */
  async install({plugin, installType, packageName}) {
    return await super._install({
      installSpec: plugin,
      installType,
      packageName,
    });
  }

  /**
   * Uninstall a plugin
   *
   * @param {PluginUninstallOpts} opts
   * @returns {Promise<ExtRecord<PluginType>>}
   */
  async uninstall({plugin}) {
    return await super._uninstall({installSpec: plugin});
  }

  /**
   * Update a plugin
   *
   * @param {PluginUpdateOpts} opts
   * @returns {Promise<import('./extension-command').ExtensionUpdateResult>}
   */
  async update({plugin, unsafe}) {
    return await super._update({installSpec: plugin, unsafe});
  }

  /**
   *
   * @param {PluginRunOptions} opts
   * @returns {Promise<import('./extension-command').RunOutput>}
   */
  async run({plugin, scriptName, extraArgs}) {
    return await super._run({
      installSpec: plugin,
      scriptName,
      extraArgs,
      bufferOutput: this.isJsonOutput,
    });
  }

  /**
   * Runs doctor checks for the given plugin
   *
   * @param {PluginDoctorOptions} opts
   * @returns {Promise<number>} The amount of executed doctor checks.
   * @throws {Error} If any of the mandatory Doctor checks fails.
   */
  async doctor({plugin}) {
    return await super._doctor({
      installSpec: plugin,
    });
  }

  /**
   *
   * @param {import('./extension-command').ExtensionArgs} opts
   * @returns {string}
   */
  getPostInstallText({extName, extData}) {
    return `Plugin ${extName}@${extData.version} successfully installed`.green;
  }

  /**
   * Validates fields in `appium` field of `pluginMetadata`
   *
   * For any `package.json` fields which a plugin requires, validate the type of
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
 * @typedef {import('@appium/types').ExtensionType} ExtensionType
 * @typedef {import('@appium/types').PluginType} PluginType
 */

/**
 * @template {ExtensionType} ExtType
 * @typedef {import('appium/types').ExtRecord<ExtType>} ExtRecord
 */

/**
 * Options for {@linkcode PluginCliCommand.install}
 * @typedef PluginInstallOpts
 * @property {string} plugin - the name or spec of a plugin to install
 * @property {InstallType} installType - how to install this plugin. One of the INSTALL_TYPES
 * @property {string} [packageName] - for git/github installs, the plugin node package name
 */

/**
 * @typedef {import('appium/types').InstallType} InstallType
 */

/**
 * Options for {@linkcode PluginCliCommand.uninstall}
 * @typedef PluginUninstallOpts
 * @property {string} plugin - the name or spec of a plugin to uninstall
 */

/**
 * Options for {@linkcode PluginCliCommand.update}
 * @typedef PluginUpdateOpts
 * @property {string} plugin - the name of the plugin to update
 * @property {boolean} unsafe - if true, will perform unsafe updates past major revision boundaries
 */

/**
 * Options for {@linkcode PluginCliCommand.run}.
 * @typedef PluginRunOptions
 * @property {string} plugin - name of the plugin to run a script from
 * @property {string} scriptName - name of the script to run
 * @property {string[]} [extraArgs] - arguments to pass to the script
 */

/**
 * Options for {@linkcode PluginCliCommand.doctor}.
 * @typedef PluginDoctorOptions
 * @property {string} plugin - name of the plugin to run doctor checks for
 */
