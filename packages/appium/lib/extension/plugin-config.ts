import _ from 'lodash';
import type {PluginType} from '@appium/types';
import type {ExtManifest, ExtName, ExtRecord} from 'appium/types';
import {PLUGIN_TYPE} from '../constants';
import {log} from '../logger';
import {ExtensionConfig} from './extension-config';
import type {Manifest} from './manifest';

export class PluginConfig extends ExtensionConfig<PluginType> {
  private static readonly _instances = new WeakMap<Manifest, PluginConfig>();

  private constructor(manifest: Manifest) {
    super(PLUGIN_TYPE, manifest);
  }

  static create(manifest: Manifest): PluginConfig {
    const instance = new PluginConfig(manifest);
    if (PluginConfig.getInstance(manifest)) {
      throw new Error(
        `Manifest with APPIUM_HOME ${manifest.appiumHome} already has a PluginConfig; use PluginConfig.getInstance() to retrieve it.`
      );
    }
    PluginConfig._instances.set(manifest, instance);
    return instance;
  }

  static getInstance(manifest: Manifest): PluginConfig | undefined {
    return PluginConfig._instances.get(manifest);
  }

  async validate(): Promise<ExtRecord<PluginType>> {
    return await super._validate(this.manifest.getExtensionData(PLUGIN_TYPE));
  }

  public override extensionDesc(
    pluginName: ExtName<PluginType>,
    {version}: ExtManifest<PluginType>
  ): string {
    return `${String(pluginName)}@${version}`;
  }

  override print(activeNames: ExtName<PluginType>[] = []): void {
    const pluginNames = Object.keys(this.installedExtensions);

    if (_.isEmpty(pluginNames)) {
      log.info(
        `No plugins have been installed. Use the "appium plugin" ` + 'command to install the one(s) you want to use.'
      );
      return;
    }

    log.info(`Available plugins:`);
    for (const [pluginName, pluginData] of _.toPairs(this.installedExtensions)) {
      const activeTxt = _.includes(activeNames, pluginName as ExtName<PluginType>) ? ' (ACTIVE)' : '';
      log.info(`  - ${this.extensionDesc(pluginName as ExtName<PluginType>, pluginData)}${activeTxt}`);
    }

    if (_.isEmpty(activeNames)) {
      log.info('No plugins activated. Use the --use-plugins flag with names of plugins to activate');
    }
  }
}
