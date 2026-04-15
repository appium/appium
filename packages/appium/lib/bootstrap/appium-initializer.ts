import {init as logsinkInit} from '../logsink';
import {log as logger} from '../logger';
import {util, env} from '@appium/support';
import _ from 'lodash';
import type {DriverOpts} from '@appium/types';
import {AppiumDriver, type AppiumDriverConstraints} from '../appium';
import {runExtensionCommand} from '../cli/extension';
import {runSetupCommand} from '../cli/setup-command';
import {getParser, ArgParser} from '../cli/parser';
import {readConfigFile} from './config-file';
import {getNonDefaultServerArgs, showConfig} from './startup-config';
import {adjustNodePath, requireDir, showDebugInfo} from './node-helpers';
import {loadExtensions, type ExtensionConfigs} from '../extension';
import {SERVER_SUBCOMMAND} from '../constants';
import {injectAppiumSymlinks} from '../cli/extension-command';
import {getDefaultsForSchema} from '../schema/schema';
import {
  isDriverCommandArgs,
  isExtensionCommandArgs,
  isPluginCommandArgs,
  isServerCommandArgs,
  isSetupCommandArgs,
} from '../schema/cli-args-guards';
import type {
  Args,
  CliCommand,
  CliCommandServer,
  CliCommandSetupSubcommand,
  CliExtensionSubcommand,
  ParsedArgs,
} from 'appium/types';
import {determineAppiumHomeSource, preflightChecks} from './main-helpers';
import type {InitResult, PreConfigArgs} from './init-types';

/**
 * Parses CLI/programmatic args, loads config and extensions, and returns server-ready state or runs extension/setup flows.
 */
export class AppiumInitializer {
  private throwInsteadOfExit = false;

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
    this.throwInsteadOfExit = false;

    const appiumHome = args?.appiumHome ?? (await env.resolveAppiumHome());
    const appiumHomeSourceName = determineAppiumHomeSource(args?.appiumHome);
    await requireDir(appiumHome, false, appiumHomeSourceName);

    adjustNodePath();

    const {driverConfig, pluginConfig} = await loadExtensions(appiumHome);

    const {preConfigArgs, throwInsteadOfExit} = await this.parsePreConfigArgs(args);
    this.throwInsteadOfExit = throwInsteadOfExit;

    const configResult = await readConfigFile(preConfigArgs.configFile);
    this.assertConfigFileOk(configResult);

    if (isServerCommandArgs(preConfigArgs)) {
      return this.finishServerInit(
        preConfigArgs,
        configResult,
        driverConfig,
        pluginConfig,
        appiumHome,
        appiumHomeSourceName,
      );
    }

    if (isSetupCommandArgs(preConfigArgs)) {
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
  >(args?: Args<Cmd, SubCmd>): Promise<{preConfigArgs: PreConfigArgs; throwInsteadOfExit: boolean}> {
    const parser = await getParser();
    let throwInsteadOfExit = false;

    if (args) {
      if (args.throwInsteadOfExit) {
        throwInsteadOfExit = true;
        delete args.throwInsteadOfExit;
      }
      const preConfigArgs = {...args, subcommand: args.subcommand ?? SERVER_SUBCOMMAND} as PreConfigArgs;
      ArgParser.normalizeServerArgs(preConfigArgs);
      return {preConfigArgs, throwInsteadOfExit};
    }

    return {preConfigArgs: parser.parseArgs() as PreConfigArgs, throwInsteadOfExit};
  }

  private assertConfigFileOk(configResult: Awaited<ReturnType<typeof readConfigFile>>): void {
    if (!_.isEmpty(configResult.errors)) {
      throw new Error(
        `Errors in config file ${configResult.filepath}:\n ${configResult.reason ?? configResult.errors}`,
      );
    }
  }

  private async finishServerInit<Cmd extends CliCommand>(
    preConfigArgs: PreConfigArgs,
    configResult: Awaited<ReturnType<typeof readConfigFile>>,
    driverConfig: ExtensionConfigs['driverConfig'],
    pluginConfig: ExtensionConfigs['pluginConfig'],
    appiumHome: string,
    appiumHomeSourceName: string,
  ): Promise<InitResult<Cmd>> {
    const defaults = getDefaultsForSchema(false);
    const serverArgs = _.defaultsDeep(
      {},
      preConfigArgs,
      configResult.config?.server,
      defaults,
    ) as ParsedArgs<CliCommandServer>;

    if (preConfigArgs.showConfig) {
      showConfig(getNonDefaultServerArgs(preConfigArgs as Args), configResult, defaults, serverArgs);
      return {} as InitResult<Cmd>;
    }

    if (preConfigArgs.showDebugInfo) {
      await showDebugInfo({
        driverConfig,
        pluginConfig,
        appiumHome,
      });
      return {} as InitResult<Cmd>;
    }

    await logsinkInit(serverArgs);
    await this.applyLogFilters(serverArgs);

    if (!serverArgs.noPermsCheck) {
      await requireDir(appiumHome, true, appiumHomeSourceName);
    }

    const appiumDriver = new AppiumDriver(serverArgs as DriverOpts<AppiumDriverConstraints>);
    appiumDriver.driverConfig = driverConfig;
    await preflightChecks(serverArgs, this.throwInsteadOfExit);

    return {
      appiumDriver,
      parsedArgs: serverArgs,
      driverConfig,
      pluginConfig,
      appiumHome,
    } as InitResult<Cmd>;
  }

  private async applyLogFilters(serverArgs: ParsedArgs<CliCommandServer>): Promise<void> {
    if (!serverArgs.logFilters) {
      return;
    }
    const {issues, rules} = await logger.unwrap().loadSecureValuesPreprocessingRules(serverArgs.logFilters);
    const argToLog = _.truncate(JSON.stringify(serverArgs.logFilters), {
      length: 150,
    });
    if (!_.isEmpty(issues)) {
      throw new Error(
        `The log filtering rules config ${argToLog} has issues: ` + JSON.stringify(issues, null, 2),
      );
    }
    if (_.isEmpty(rules)) {
      logger.warn(
        `Found no log filtering rules in the ${argToLog} config. ` + `Is that expected?`,
      );
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
      const cmd = isDriverCommandArgs(preConfigArgs)
        ? preConfigArgs.driverCommand
        : preConfigArgs.pluginCommand;
      if (cmd === 'install') {
        await injectAppiumSymlinks(driverConfig, pluginConfig, logger);
      }
    }
  }
}
