import _ from 'lodash';
import type {
  Args,
  CliCommandSetup,
  CliCommandSetupSubcommand,
  CliExtensionCommand,
  CliExtensionSubcommand,
} from 'appium/types';
import {
  DESKTOP_BROWSERS,
  DESKTOP_DRIVERS,
  MOBILE_DRIVERS
} from '../constants';
import {runExtensionCommand} from './extension';
import { system, fs } from '@appium/support';
import {log} from '../logger';
import type {ExtensionConfig} from '../extension/extension-config';

/**
 * Subcommands of preset for setup
 */
export const SUBCOMMAND_MOBILE = 'mobile';
export const SUBCOMMAND_DESKTOP = 'desktop';
export const SUBCOMMAND_BROWSER = 'browser';
export const SUBCOMMAND_RESET = 'reset';

/**
 * Pairs of preset subcommand and driver candidates.
 * Driver names listed in KNOWN_DRIVERS to install by default
 */
const PRESET_PAIRS = Object.freeze({
  mobile: _.keys(MOBILE_DRIVERS),
  desktop: _.keys(DESKTOP_DRIVERS),
  browser: _.keys(DESKTOP_BROWSERS),
} as const);
const DRIVERS_ONLY_MACOS = ['xcuitest', 'safari', 'mac2'];

const DRIVERS_ONLY_WINDOWS = ['windows'];

/**
 * Plugin names listed in KNOWN_PLUGINS to install by default.
 */
export const DEFAULT_PLUGINS = ['images', 'inspector'];

type DriverConfig = ExtensionConfig<'driver'>;
type PluginConfig = ExtensionConfig<'plugin'>;
type CliExtArgs = Args<CliExtensionCommand, CliExtensionSubcommand>;

/**
 * Return a list of drivers available for current host platform.
 */
export function getPresetDrivers(presetName: CliCommandSetupSubcommand): string[] {
  return _.filter(PRESET_PAIRS[presetName], (driver) => {
    if (_.includes(DRIVERS_ONLY_MACOS, driver)) {
      return system.isMac();
    }

    if (_.includes(DRIVERS_ONLY_WINDOWS, driver)) {
      return system.isWindows();
    }

    return true;
  });

}

/**
 * Return desktop platform name for setup command description.
 */
export function determinePlatformName(): string {
  if (system.isMac()) {
    return 'macOS';
  } else if (system.isWindows()) {
    return 'Windows';
  }
  return 'Linux';
}

/**
 * Runs the `setup` command and applies the selected preset.
 *
 * Depending on the subcommand, this installs mobile/desktop/browser presets or
 * removes all installed extensions and manifests via `reset`.
 */
export async function runSetupCommand(
  preConfigArgs: Args<CliCommandSetup>,
  driverConfig: DriverConfig,
  pluginConfig: PluginConfig
): Promise<void> {
  switch (preConfigArgs.setupCommand) {
    case SUBCOMMAND_DESKTOP:
      await setupDesktopAppDrivers(driverConfig);
      await setupDefaultPlugins(pluginConfig);
      break;
    case SUBCOMMAND_BROWSER:
      await setupBrowserDrivers(driverConfig);
      await setupDefaultPlugins(pluginConfig);
      break;
    case SUBCOMMAND_RESET:
      await resetAllExtensions(driverConfig, pluginConfig);
      break;
    default:
      await setupMobileDrivers(driverConfig);
      await setupDefaultPlugins(pluginConfig);
      break;
  }
};

/**
 * Resets all installed drivers and extensions
 */
async function resetAllExtensions(driverConfig: DriverConfig, pluginConfig: PluginConfig): Promise<void> {
  const commandConfigs: [CliExtensionCommand, DriverConfig | PluginConfig][] = [
    ['driver', driverConfig],
    ['plugin', pluginConfig],
  ];
  for (const [command, config] of commandConfigs) {
    for (const extensionName of _.keys(config.installedExtensions)) {
      try {
        await uninstallExtension(
          extensionName,
          extensionCommandArgs(command, extensionName, 'uninstall'),
          config
        );
      } catch (e) {
        log.warn(
          `${extensionName} ${command} cannot be uninstalled. Will delete the manifest anyway. ` +
          `Original error: ${e.stack}`
        );
      }
    }

    const manifestPath = config.manifestPath;
    if (!manifestPath || !await fs.exists(manifestPath)) {
      continue;
    }

    await fs.rimraf(manifestPath);
    if (await fs.exists(manifestPath)) {
      throw new Error(`${command} manifest at '${manifestPath}' cannot be deleted. Is it accessible?`);
    } else {
      log.info(`Successfully deleted ${command} manifest at '${manifestPath}'`);
    }
  }
}

/**
 * Install drivers listed in DEFAULT_DRIVERS.
 */
async function setupMobileDrivers(driverConfig: DriverConfig): Promise<void> {
  await installDrivers(SUBCOMMAND_MOBILE, driverConfig);
}

/**
 * Install all of known drivers listed in BROWSER_DRIVERS.
 */
async function setupBrowserDrivers(driverConfig: DriverConfig): Promise<void> {
  await installDrivers(SUBCOMMAND_BROWSER, driverConfig);
}

/**
 * Install all of known drivers listed in DESKTOP_APP_DRIVERS.
 */
async function setupDesktopAppDrivers(driverConfig: DriverConfig): Promise<void> {
  await installDrivers(SUBCOMMAND_DESKTOP, driverConfig);
}

/**
 * Install the given driver name. It skips the installation if the given driver name was already installed.
 */
async function installDrivers(subcommand: CliCommandSetupSubcommand, driverConfig: DriverConfig): Promise<void> {
  for (const driverName of getPresetDrivers(subcommand)) {
    await installExtension(driverName, extensionCommandArgs('driver', driverName, 'install'), driverConfig);
  }
}

/**
 * Install plugins listed in DEFAULT_PLUGINS.
 */
async function setupDefaultPlugins(pluginConfig: PluginConfig): Promise<void> {
  for (const pluginName of DEFAULT_PLUGINS) {
    await installExtension(pluginName, extensionCommandArgs('plugin', pluginName, 'install'), pluginConfig);
  }
}

/**
 * Run the given extensionConfigArgs command after checking if the given extensionName was already installed.
 */
async function installExtension(
  extensionName: string,
  extensionConfigArgs: CliExtArgs,
  extensionConfig: DriverConfig | PluginConfig
): Promise<void> {
  if (_.keys(extensionConfig.installedExtensions).includes(extensionName)) {
    log.info(`${extensionName} (${extensionConfig.installedExtensions[extensionName].version}) is already installed. ` +
      `Skipping the installation.`);
    return;
  }
  await runExtensionCommand(extensionConfigArgs, extensionConfig);
}

/**
 * Run the given extensionConfigArgs command after checking if the given extensionName was already installed.
 */
async function uninstallExtension(
  extensionName: string,
  extensionConfigArgs: CliExtArgs,
  extensionConfig: DriverConfig | PluginConfig
): Promise<void> {
  if (!_.keys(extensionConfig.installedExtensions).includes(extensionName)) {
    log.info(`${extensionName} (${extensionConfig.installedExtensions[extensionName].version}) is not installed. ` +
      `Skipping its uninstall.`);
    return;
  }
  await runExtensionCommand(extensionConfigArgs, extensionConfig);
}

/**
 * Return the command config for driver or plugin.
 */
function extensionCommandArgs(
  extensionCommand: CliExtensionCommand,
  extensionName: string,
  command: CliExtensionSubcommand
): CliExtArgs {
  return (extensionCommand === 'plugin')
    ? {'subcommand': 'plugin', 'pluginCommand': command, 'plugin': extensionName}
    : {'subcommand': 'driver', 'driverCommand': command, 'driver': extensionName};
}

