import type {AppiumDriver} from '../appium';
import type {
  Args,
  CliCommand,
  CliCommandServer,
  CliCommandSetupSubcommand,
  CliExtensionSubcommand,
  ParsedArgs,
} from 'appium/types';
import type {ExtensionConfigs} from '../extension';

/** Empty object returned when `init` completes for non-server CLI flows (extension/setup). */
export type ExtCommandInitResult = Record<string, never>;

/** Driver/plugin config plus server instance and merged server args after successful server `init`. */
export type ServerInitData = ExtensionConfigs & {
  appiumDriver: AppiumDriver;
  parsedArgs: ParsedArgs<CliCommandServer>;
  appiumHome: string;
};

/** Discriminated by CLI command: server subcommand yields {@link ServerInitData}; otherwise {@link ExtCommandInitResult}. */
export type InitResult<Cmd extends CliCommand = CliCommandServer> = Cmd extends CliCommandServer
  ? ServerInitData
  : ExtCommandInitResult;

/** CLI + programmatic args before `init` narrows by `subcommand`. */
export type PreConfigArgs = Args<
  CliCommand,
  CliExtensionSubcommand | CliCommandSetupSubcommand | void
>;
