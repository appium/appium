#!/usr/bin/env node

import {LogLevel} from 'consola';
import _ from 'lodash';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';
import {build, init, validate} from './command';
import {DocutilsError} from '../error';
import log from '../logger';
import {DEFAULT_LOG_LEVEL, NAME_BIN} from '../constants';

const LogLevelName = {
  silent: LogLevel.Silent,
  error: LogLevel.Error,
  warn: LogLevel.Warn,
  info: LogLevel.Info,
  debug: LogLevel.Debug,
} as const;

export async function main(argv = hideBin(process.argv)) {
  const y = yargs(argv);
  return await y
    .scriptName(NAME_BIN)
    .command(build)
    .command(init)
    .command(validate)
    .options({
      verbose: {
        alias: 'V',
        type: 'boolean',
        describe: 'Alias for --log-level=debug',
      },
      'log-level': {
        alias: 'L',
        choices: ['debug', 'info', 'warn', 'error', 'silent'],
        default: DEFAULT_LOG_LEVEL,
        describe: 'Sets the log level',
        coerce: _.identity as (x: string) => keyof typeof LogLevelName,
      },
    })
    .middleware(
      /**
       * Configures logging; `--verbose` implies `--log-level=debug`
       */
      (argv) => {
        const {logLevel, verbose} = argv;
        if (verbose) {
          argv.logLevel = 'debug';
          log.debug('Debug logging enabled via --verbose');
        }
        log.level = LogLevelName[logLevel];
      }
    )
    .fail(
      /**
       * Custom failure handler so we can log nicely.
       */
      (msg: string | null, error) => {
        // if it is a DocutilsError, it has nothing to do with the CLI
        if (error instanceof DocutilsError) {
          log.error(error.message);
        } else {
          y.showHelp();
          log.error(msg ?? error.message);
        }
        y.exit(1, error);
      }
    )
    // at least one command is required (but not for --version or --help)
    .demandCommand(1)
    // fail if unknown option or command is provided
    .strict()
    .parseAsync();
}

if (require.main === module) {
  // eslint-disable-next-line promise/prefer-await-to-then
  main().catch((err) => {
    log.error('Caught otherwise-unhandled rejection (this is probably a bug):', err);
  });
}
