import _ from 'lodash';
import type {ExtMetadata, ExtRecord, InstallType} from 'appium/types';
import ExtensionCliCommand from './extension-command';
import type {
  ExtensionArgs,
  ExtensionCommandOptions,
  ExtensionUpdateResult,
  PostInstallText,
  RunOutput,
} from './extension-command';
import {KNOWN_PLUGINS} from '../constants';

const REQ_PLUGIN_FIELDS = ['pluginName', 'mainClass'];
type PluginInstallOpts = {plugin: string; installType: InstallType; packageName?: string};
type PluginUninstallOpts = {plugin: string};
type PluginUpdateOpts = {plugin: string; unsafe: boolean};
type PluginRunOptions = {plugin: string; scriptName: string; extraArgs?: string[]};
type PluginDoctorOptions = {plugin: string};

export default class PluginCliCommand extends ExtensionCliCommand<'plugin'> {
  constructor({config, json}: ExtensionCommandOptions<'plugin'>) {
    super({config, json});
    this.knownExtensions = KNOWN_PLUGINS;
  }

  /**
   * Install a plugin
   *
   * @param opts - install options
   */
  async install({plugin, installType, packageName}: PluginInstallOpts): Promise<ExtRecord<'plugin'>> {
    return await super._install({
      installSpec: plugin,
      installType,
      packageName,
    });
  }

  /**
   * Uninstall a plugin
   *
   * @param opts - uninstall options
   */
  async uninstall({plugin}: PluginUninstallOpts): Promise<ExtRecord<'plugin'>> {
    return await super._uninstall({installSpec: plugin});
  }

  /**
   * Update a plugin
   *
   * @param opts - update options
   */
  async update({plugin, unsafe}: PluginUpdateOpts): Promise<ExtensionUpdateResult> {
    return await super._update({installSpec: plugin, unsafe});
  }

  /**
   * Run a script from a plugin
   *
   * @param opts - script execution options
   * @throws {Error} if the script fails to run
   */
  async run({plugin, scriptName, extraArgs}: PluginRunOptions): Promise<RunOutput> {
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
   * @param opts - doctor command options
   * @returns The amount of executed doctor checks.
   * @throws {Error} If any of the mandatory Doctor checks fails.
   */
  async doctor({plugin}: PluginDoctorOptions): Promise<number> {
    return await super._doctor({
      installSpec: plugin,
    });
  }

  /**
   * Builds the success message displayed after a plugin installation.
   *
   * @param args - installed extension name and metadata
   * @returns formatted success text
   */
  override getPostInstallText({extName, extData}: ExtensionArgs<'plugin'>): PostInstallText {
    return `Plugin ${extName}@${extData.version} successfully installed`.green;
  }

  /**
   * Validates fields in `appium` field of `pluginMetadata`
   *
   * For any `package.json` fields which a plugin requires, validate the type of
   * those fields on the `package.json` data, throwing an error if anything is
   * amiss.
   * @param pluginMetadata - `appium` metadata from extension package
   * @param installSpec - install spec from CLI
   */
  override validateExtensionFields(pluginMetadata: ExtMetadata<'plugin'>, installSpec: string): void {
    const missingFields = REQ_PLUGIN_FIELDS.reduce(
      (acc, field) => (pluginMetadata[field] ? acc : [...acc, field]),
      []
    );

    if (!_.isEmpty(missingFields)) {
      throw new Error(
        `Installed plugin "${installSpec}" did not expose correct fields for compatibility ` +
          `with Appium. Missing fields: ${JSON.stringify(missingFields)}`
      );
    }
  }
}
