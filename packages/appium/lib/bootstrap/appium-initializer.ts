import {console as supportConsole, util} from '@appium/support';
import type {AppiumConfig, DriverOpts} from '@appium/types';
import type {
  Args,
  CliCommand,
  CliCommandServer,
  CliCommandSetupSubcommand,
  CliExtensionSubcommand,
  ParsedArgs,
} from 'appium/types/index.js';

import {AppiumDriver, type AppiumDriverConstraints} from '../appium.js';
import {injectAppiumSymlinks} from '../cli/extension-command.js';
import {runExtensionCommand} from '../cli/extension.js';
import {ArgParser, getCliServerSelection, getParser} from '../cli/parser.js';
import {runSetupCommand} from '../cli/setup-command.js';
import {SERVER_SUBCOMMAND} from '../constants.js';
import {type ExtensionConfigs, isDriverLocation, loadExtensions} from '../extension/index.js';
import {log as logger} from '../logger.js';
import {init as logsinkInit} from '../logsink.js';
import type {ErrorObject} from '../schema/ajv.js';
import {
  isDriverCommandArgs,
  isExtensionCommandArgs,
  isPluginCommandArgs,
  isServerCommandArgs,
  isSetupCommandArgs,
} from '../schema/cli-args-guards.js';
import {appiumSchema, type AppiumSchema} from '../schema/schema.js';
import {defaultsDeep, resolveAppiumHome} from '../utils/index.js';
import {loadConfigFile, validateConfigFile, type ReadConfigFileResult} from './config-file.js';
import type {InitResult, PreConfigArgs} from './init-types.js';
import {determineAppiumHomeSource, preflightChecks} from './main-helpers.js';
import {adjustNodePath, requireDir, showDebugInfo} from './node-helpers.js';
import {getNonDefaultServerArgs, showConfig} from './startup-config.js';

type PreConfig = {preConfigArgs: PreConfigArgs; throwInsteadOfExit: boolean};

/**
 * Parses CLI/programmatic args, loads config and extensions, and returns server-ready state or runs extension/setup flows.
 */
export class AppiumInitializer {
  /**
   * Resolves Appium home, loads config, and either returns server-ready state for the server subcommand
   * or performs setup/extension CLI work and returns an empty result.
   *
   * @param args - Optional programmatic args; when omitted, parses `process.argv`
   */
  async init<
    Cmd extends CliCommand = CliCommandServer,
    SubCmd extends CliExtensionSubcommand | CliCommandSetupSubcommand | void = void,
  >(args?: Args<Cmd, SubCmd>): Promise<InitResult<Cmd>> {
    const appiumHome = args?.appiumHome ?? (await resolveAppiumHome());
    const appiumHomeSourceName = determineAppiumHomeSource(args?.appiumHome);
    await requireDir(appiumHome, false, appiumHomeSourceName);

    adjustNodePath();

    const extensions = await loadExtensions(appiumHome);
    const {driverConfig, pluginConfig} = extensions;
    const serverDriverConfig = driverConfig.createServerConfig();
    const selection = args ? getProgrammaticServerSelection(args as PreConfigArgs) : getCliServerSelection();
    const configFile = selection && !selection.help ? await loadConfigFile(selection.configFile) : undefined;
    const fileConfig = configFile?.result?.config as AppiumConfig | undefined;
    const useDrivers = selection?.useDrivers ?? fileConfig?.server?.['use-drivers'];
    if (Array.isArray(useDrivers) && useDrivers.every((entry) => typeof entry === 'string')) {
      for (const location of useDrivers.filter(isDriverLocation)) {
        await serverDriverConfig.addResolvedDriver(location);
      }
    }

    const configSchema = await serverDriverConfig.getStartupSchema();
    // The existing public schema helpers still describe the installed extensions.
    await appiumSchema.finalize();
    const preConfig = await this.parsePreConfigArgs(configSchema, args);
    const {preConfigArgs} = preConfig;

    const loadedFile =
      configFile && selection?.configFile === preConfigArgs.configFile
        ? configFile
        : await loadConfigFile(preConfigArgs.configFile);
    const configResult = validateConfigFile(loadedFile, {}, configSchema);
    this.assertConfigFileOk(configResult);

    if (isServerCommandArgs(preConfigArgs)) {
      serverDriverConfig.normalizeResolvedDriverArgs(configResult.config, configSchema);
      return this.finishServerInit(
        preConfig,
        configResult,
        extensions,
        serverDriverConfig,
        configSchema,
        appiumHomeSourceName,
      );
    }

    if (isSetupCommandArgs(preConfigArgs)) {
      this.printValidationSummaries(driverConfig, pluginConfig);
      await runSetupCommand(preConfigArgs, driverConfig, pluginConfig);
      return {} as InitResult<Cmd>;
    }

    await requireDir(appiumHome, true, appiumHomeSourceName);
    await this.runExtensionCliIfNeeded(preConfigArgs, driverConfig, pluginConfig);
    return {} as InitResult<Cmd>;
  }

  private async parsePreConfigArgs<
    Cmd extends CliCommand,
    SubCmd extends CliExtensionSubcommand | CliCommandSetupSubcommand | void,
  >(configSchema: AppiumSchema, args?: Args<Cmd, SubCmd>): Promise<PreConfig> {
    if (args) {
      await configSchema.finalize();
      const {throwInsteadOfExit = false, ...serverArgs} = args;
      const preConfigArgs = {...serverArgs, subcommand: args.subcommand ?? SERVER_SUBCOMMAND} as PreConfigArgs;
      ArgParser.normalizeServerArgs(preConfigArgs, configSchema);
      return {preConfigArgs, throwInsteadOfExit};
    }

    const parser = await getParser(false, configSchema);
    return {preConfigArgs: parser.parseArgs() as PreConfigArgs, throwInsteadOfExit: false};
  }

  private assertConfigFileOk(configResult: ReadConfigFileResult): void {
    if (!util.isEmpty(configResult.errors)) {
      let errorsListString: string;
      if (configResult.reason) {
        errorsListString =
          typeof configResult.reason !== 'string'
            ? configResult.reason.map((r) => r.error).join(', ')
            : configResult.reason;
      } else {
        errorsListString = (configResult.errors as ErrorObject[])?.map((e) => e.message).join(', ');
      }
      throw new Error(`Errors in config file ${configResult.filepath}:\n ${errorsListString}`);
    }
  }

  private async finishServerInit<Cmd extends CliCommand>(
    {preConfigArgs, throwInsteadOfExit}: PreConfig,
    configResult: ReadConfigFileResult,
    {driverConfig, pluginConfig}: ExtensionConfigs,
    serverDriverConfig: ExtensionConfigs['driverConfig'],
    configSchema: AppiumSchema,
    appiumHomeSourceName: string,
  ): Promise<InitResult<Cmd>> {
    const {appiumHome} = serverDriverConfig;
    const defaults = configSchema.getDefaults(false);
    const serverArgs = defaultsDeep(
      {},
      preConfigArgs as Record<string, unknown>,
      configResult.config?.server as Record<string, unknown> | undefined,
      defaults as Record<string, unknown>,
    ) as unknown as ParsedArgs<CliCommandServer>;

    if (preConfigArgs.showConfig) {
      showConfig(getNonDefaultServerArgs(preConfigArgs as Args, configSchema), configResult, defaults, serverArgs);
      this.printValidationSummaries(driverConfig, pluginConfig);
      return {} as InitResult<Cmd>;
    }

    if (preConfigArgs.showDebugInfo) {
      await showDebugInfo({
        driverConfig,
        pluginConfig,
        appiumHome,
      });
      this.printValidationSummaries(driverConfig, pluginConfig);
      return {} as InitResult<Cmd>;
    }

    await logsinkInit(serverArgs);
    // Deferred from loadExtensions() so these render through the now-active (Winston-backed) logger.
    this.printValidationSummaries(driverConfig, pluginConfig);
    await this.applyLogFilters(serverArgs);

    if (!serverArgs.noPermsCheck) {
      await requireDir(appiumHome, true, appiumHomeSourceName);
    }

    const appiumDriver = new AppiumDriver(serverArgs as DriverOpts<AppiumDriverConstraints>, configSchema);
    appiumDriver.driverConfig = serverDriverConfig;
    await preflightChecks(serverArgs, throwInsteadOfExit);

    return {
      appiumDriver,
      parsedArgs: serverArgs,
      driverConfig: serverDriverConfig,
      pluginConfig,
      appiumHome,
    } as InitResult<Cmd>;
  }

  /** Renders each config's pending `loadExtensions()`-time validation summary via the raw logger. */
  private printValidationSummaries(
    driverConfig: ExtensionConfigs['driverConfig'],
    pluginConfig: ExtensionConfigs['pluginConfig'],
  ): void {
    driverConfig.printValidationSummary(logger);
    pluginConfig.printValidationSummary(logger);
  }

  private async applyLogFilters(serverArgs: ParsedArgs<CliCommandServer>): Promise<void> {
    if (!serverArgs.logFilters) {
      return;
    }
    const {issues, rules} = await logger.unwrap().loadSecureValuesPreprocessingRules(serverArgs.logFilters);
    const argToLog = util.truncateString(JSON.stringify(serverArgs.logFilters), {length: 150});
    if (!util.isEmpty(issues)) {
      throw new Error(`The log filtering rules config ${argToLog} has issues: ` + JSON.stringify(issues, null, 2));
    }
    if (util.isEmpty(rules)) {
      logger.warn(`Found no log filtering rules in the ${argToLog} config. ` + `Is that expected?`);
    } else {
      logger.info(`Loaded ${util.pluralize('filtering rule', rules.length, true)}`);
    }
  }

  private async runExtensionCliIfNeeded(
    preConfigArgs: PreConfigArgs,
    driverConfig: ExtensionConfigs['driverConfig'],
    pluginConfig: ExtensionConfigs['pluginConfig'],
  ): Promise<void> {
    if (!isExtensionCommandArgs(preConfigArgs)) {
      return;
    }
    if (isDriverCommandArgs(preConfigArgs)) {
      await runExtensionCommand(preConfigArgs, driverConfig);
    }
    if (isPluginCommandArgs(preConfigArgs)) {
      await runExtensionCommand(preConfigArgs, pluginConfig);
    }

    if (isDriverCommandArgs(preConfigArgs) || isPluginCommandArgs(preConfigArgs)) {
      const cmd = isDriverCommandArgs(preConfigArgs) ? preConfigArgs.driverCommand : preConfigArgs.pluginCommand;
      if (cmd === 'install') {
        // Match the same command's own console so a non-fatal symlink error never lands on
        // STDOUT under `--json` (unlike the raw npmlog logger, which isn't JSON-mode-aware).
        const symlinkLog = new supportConsole.CliConsole({jsonMode: Boolean(preConfigArgs.json)});
        await injectAppiumSymlinks(driverConfig, pluginConfig, symlinkLog);
      }
    }
  }
}

function getProgrammaticServerSelection(args: PreConfigArgs): ReturnType<typeof getCliServerSelection> {
  if (!args.subcommand || isServerCommandArgs(args)) {
    return {configFile: args.configFile, useDrivers: 'useDrivers' in args ? args.useDrivers : undefined};
  }
}
