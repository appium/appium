import path from 'node:path';

import {timing, util} from '@appium/support';
import type {DriverClass, ExtensionType, PluginClass} from '@appium/types';
import type {EmbeddedDriverModule, ExtClass} from 'appium/types/index.js';
import {asyncmap} from 'asyncbox';

import {USE_ALL_PLUGINS} from '../constants.js';
import {log} from '../logger.js';
import {withManifestLock, zip} from '../utils/index.js';
import {DriverConfig} from './driver-config.js';
import {Manifest} from './manifest/index.js';
import {PluginConfig} from './plugin-config.js';

export type ExtensionConfigs = {
  driverConfig: DriverConfig;
  pluginConfig: PluginConfig;
};

export type PluginNameMap = Map<PluginClass, string>;
export type DriverNameMap = Map<DriverClass, string>;

/**
 * Re-reads `manifest` from disk and revalidates whichever `DriverConfig`/`PluginConfig`
 * singletons already exist for it, so their derived state (installed extensions, pending
 * validation summary, {@link DriverConfig}'s duplicate-`automationName` tracking) reflects the
 * freshly-read data rather than a stale pre-reload snapshot.
 *
 * Callers must run this under {@link withManifestLock} -- both because `manifest.read()` may
 * itself write the manifest (initialization, migration, or sync with installed packages), and
 * because anything a caller does afterward that depends on the result staying current (e.g.
 * writing the manifest back out) needs to stay in the same critical section.
 */
export async function reloadManifest(manifest: Manifest): Promise<void> {
  await manifest.read();
  await Promise.all([DriverConfig.getInstance(manifest)?.validate(), PluginConfig.getInstance(manifest)?.validate()]);
}

/**
 * Loads extensions and creates `ExtensionConfig` instances.
 *
 * - Reads the manifest file, creating if necessary
 * - Using the parsed extension data, creates/gets the `ExtensionConfig` subclass instances
 * - Returns these instances
 *
 * If `appiumHome` is needed, use `resolveAppiumHome` from `../utils/index.js`.
 */
export async function loadExtensions(appiumHome: string): Promise<ExtensionConfigs> {
  const manifest = Manifest.getInstance(appiumHome);
  const driverConfig = DriverConfig.getInstance(manifest) ?? DriverConfig.create(manifest);
  const pluginConfig = PluginConfig.getInstance(manifest) ?? PluginConfig.create(manifest);

  await withManifestLock(appiumHome, () => reloadManifest(manifest));

  return {driverConfig, pluginConfig};
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
            } ` + `available: ${Object.keys(pluginConfig.installedExtensions).join(', ')}`;
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
 *
 * Besides names of installed drivers, `useDrivers` may contain the absolute path or `file:` URL of a
 * driver package (or of any file in it), which is then used without being installed in `APPIUM_HOME`.
 * See {@linkcode DriverConfig.addResolvedDriver}.
 */
export async function getActiveDrivers(
  driverConfig: DriverConfig,
  maxParallelImports: number,
  useDrivers: Array<string | EmbeddedDriverModule> = [],
): Promise<DriverNameMap> {
  let filteredDriverNames: string[] = [];
  const embeddedPairs: Array<[DriverClass, string]> = [];
  if (util.isEmpty(useDrivers)) {
    filteredDriverNames = Object.keys(driverConfig.installedExtensions);
  } else {
    for (const entry of useDrivers) {
      if (typeof entry !== 'string') {
        const driver = unwrapEmbeddedDriver(entry);
        embeddedPairs.push([driver, driverConfig.addEmbeddedDriver(driver)]);
        continue;
      }
      const driverName = entry;
      if (isDriverLocation(driverName)) {
        filteredDriverNames.push(await driverConfig.addResolvedDriver(driverName));
      } else if (driverName in driverConfig.installedExtensions) {
        filteredDriverNames.push(driverName);
      } else {
        const suffix = util.isEmpty(driverConfig.installedExtensions)
          ? `You don't have any drivers installed yet.`
          : `Only the following ${
              Object.keys(driverConfig.installedExtensions).length === 1 ? `driver is` : `drivers are`
            } ` + `available: ${Object.keys(driverConfig.installedExtensions).join(', ')}`;
        throw new Error(`Could not load the driver '${driverName}' because it is not installed. ${suffix}`);
      }
    }
  }
  const pairs = await importExtensions('driver', driverConfig, filteredDriverNames, maxParallelImports);
  return new Map([...embeddedPairs, ...(pairs as Array<[DriverClass, string]>)]);
}

/** Whether a `useDrivers` entry is the location of a driver package rather than a driver name */
function isDriverLocation(useDriversEntry: string): boolean {
  return useDriversEntry.startsWith('file:') || path.isAbsolute(useDriversEntry);
}

function isDriverClass(value: unknown): value is DriverClass {
  return (
    typeof value === 'function' &&
    typeof (value as {prototype?: {createSession?: unknown}}).prototype?.createSession === 'function'
  );
}

/**
 * Accept a direct class or an ESM namespace/default-export wrapper. Requiring
 * exactly one distinct DriverClass keeps ambiguous module namespaces explicit.
 */
function unwrapEmbeddedDriver(value: EmbeddedDriverModule): DriverClass {
  if (isDriverClass(value)) {
    return value;
  }
  const candidates = new Set<DriverClass>();
  for (const exported of Object.values(value)) {
    if (isDriverClass(exported)) {
      candidates.add(exported);
    }
  }
  if (candidates.size !== 1) {
    throw new TypeError(
      `A useDrivers module entry must expose exactly one Appium driver class; found ${candidates.size}`,
    );
  }
  return [...candidates][0];
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
    {concurrency: asyncImportChunkSize},
  );
  return zip(extClasses, extNames).filter(([extClass]) => Boolean(extClass)) as Array<
    [ExtClass<ExtensionType>, string]
  >;
}
