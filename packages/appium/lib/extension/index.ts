import { timing, util } from '@appium/support';
import type { DriverClass, ExtensionType, PluginClass } from '@appium/types';
import type { ExtClass } from 'appium/types';
import { asyncmap } from 'asyncbox';
import { USE_ALL_PLUGINS } from '../constants';
import { log } from '../logger';
import { zip } from '../utils';
import { DriverConfig } from './driver-config';
import { Manifest } from './manifest';
import { PluginConfig } from './plugin-config';

export type ExtensionConfigs = {
  driverConfig: DriverConfig;
  pluginConfig: PluginConfig;
};

export type PluginNameMap = Map<PluginClass, string>;
export type DriverNameMap = Map<DriverClass, string>;

/**
 * Loads extensions and creates `ExtensionConfig` instances.
 *
 * - Reads the manifest file, creating if necessary
 * - Using the parsed extension data, creates/gets the `ExtensionConfig` subclass instances
 * - Returns these instances
 *
 * If `appiumHome` is needed, use `resolveAppiumHome` from the `env` module in `@appium/support`.
 */
export async function loadExtensions(appiumHome: string): Promise<ExtensionConfigs> {
  const manifest = Manifest.getInstance(appiumHome);
  await manifest.read();
  const driverConfig = DriverConfig.getInstance(manifest) ?? DriverConfig.create(manifest);
  const pluginConfig = PluginConfig.getInstance(manifest) ?? PluginConfig.create(manifest);

  await Promise.all([driverConfig.validate(), pluginConfig.validate()]);
  return { driverConfig, pluginConfig };
}

/**
 * Find any plugin name which has been installed, and which has been requested for activation by
 * using the --use-plugins flag, and turn each one into its class, so we can send them as objects
 * to the server init. We also want to send/assign them to the umbrella driver so it can use them
 * to wrap command execution
 */
export async function getActivePlugins(
  pluginConfig: PluginConfig,
  maxParallelImports: number,
  usePlugins: string[] = [],
): Promise<PluginNameMap> {
  if (util.isEmpty(usePlugins)) {
    return new Map();
  }

  let filteredPluginNames: string[] = [];
  if (usePlugins.length === 1 && usePlugins[0] === USE_ALL_PLUGINS) {
    filteredPluginNames = Object.keys(pluginConfig.installedExtensions);
  } else {
    for (const pluginName of usePlugins) {
      if (pluginName in pluginConfig.installedExtensions) {
        filteredPluginNames.push(pluginName);
      } else if (pluginName === USE_ALL_PLUGINS) {
        throw new Error(`The reserved plugin name '${pluginName}' cannot be combined with other names.`);
      } else {
        const suffix = util.isEmpty(pluginConfig.installedExtensions)
          ? `You don't have any plugins installed yet.`
          : `Only the following ${
              Object.keys(pluginConfig.installedExtensions).length === 1 ? `plugin is` : `plugins are`
            } ` + `available: ${Object.keys(pluginConfig.installedExtensions)}`;
        throw new Error(`Could not load the plugin '${pluginName}' because it is not installed. ${suffix}`);
      }
    }
  }
  const pairs = await importExtensions('plugin', pluginConfig, filteredPluginNames, maxParallelImports);
  return new Map(pairs as Array<[PluginClass, string]>);
}

/**
 * Find any driver name which has been installed, and turn each one into its class, so we can send
 * them as objects to the server init in case they need to add methods/routes or update the server.
 * If the --drivers flag was given, this method only loads the given drivers.
 */
export async function getActiveDrivers(
  driverConfig: DriverConfig,
  maxParallelImports: number,
  useDrivers: string[] = [],
): Promise<DriverNameMap> {
  let filteredDriverNames: string[] = [];
  if (util.isEmpty(useDrivers)) {
    filteredDriverNames = Object.keys(driverConfig.installedExtensions);
  } else {
    for (const driverName of useDrivers) {
      if (driverName in driverConfig.installedExtensions) {
        filteredDriverNames.push(driverName);
      } else {
        const suffix = util.isEmpty(driverConfig.installedExtensions)
          ? `You don't have any drivers installed yet.`
          : `Only the following ${
              Object.keys(driverConfig.installedExtensions).length === 1 ? `driver is` : `drivers are`
            } ` + `available: ${Object.keys(driverConfig.installedExtensions)}`;
        throw new Error(`Could not load the driver '${driverName}' because it is not installed. ${suffix}`);
      }
    }
  }
  const pairs = await importExtensions('driver', driverConfig, filteredDriverNames, maxParallelImports);
  return new Map(pairs as Array<[DriverClass, string]>);
}

async function importExtensions(
  extType: 'driver' | 'plugin',
  config: DriverConfig | PluginConfig,
  extNames: string[],
  asyncImportChunkSize: number,
): Promise<Array<[ExtClass<ExtensionType>, string]>> {
  const extClasses = await asyncmap(
    extNames,
    async (extName) => {
      log.info(`Attempting to load ${extType} ${extName}...`);
      const timer = new timing.Timer().start();
      try {
        const extClass = await config.requireAsync(extName as never);
        log.debug(`${extClass.name} has been successfully loaded in ${timer.getDuration().asSeconds.toFixed(3)}s`);
        return extClass as ExtClass<ExtensionType>;
      } catch (err: any) {
        log.error(
          `Could not load ${extType} '${extName}', so it will not be available. Error ` +
            `in loading the ${extType} was: ${err.message}`,
        );
        log.debug(err.stack);
      }
    },
    { concurrency: asyncImportChunkSize },
  );
  return zip(extClasses, extNames).filter(([extClass]) => Boolean(extClass)) as Array<
    [ExtClass<ExtensionType>, string]
  >;
}
