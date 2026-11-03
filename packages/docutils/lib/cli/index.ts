#!/usr/bin/env node

/**
 * Main CLI entry point for `@appium/docutils`
 * @module
 */

import {fileURLToPath} from 'node:url';

import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';

import type {LogLevelMap} from '../constants.js';
import {DEFAULT_LOG_LEVEL, NAME_BIN, PKG_ROOT_DIR} from '../constants.js';
import {DocutilsError} from '../error.js';
import {getLogger} from '../logger.js';
import {readPackage} from '../utils/index.js';
import {build, init, validate} from './command/index.js';
import {findConfig} from './config.js';

const log = getLogger('cli');
const IMPLICATIONS_FAILED_REGEX = /implications\s+failed:\n\s*(.+)\s->\s(.+)$/i;

/**
 * Entry point for the docutils CLI.
 * @param argv Raw argv values (without node/bin by default).
 */
export async function main(argv = hideBin(process.argv)) {
  const [config, pkg] = await Promise.all([findConfig(argv), readPackage({cwd: PKG_ROOT_DIR})]);

  const y = yargs(argv);
  return await y
    .scriptName(NAME_BIN)
    .command(build)
    .command(init)
    .command(validate)
    .options({
      verbose: {
        type: 'boolean',
        describe: 'Alias for --log-level=debug',
      },
      'log-level': {
        alias: 'L',
        choices: ['debug', 'info', 'warn', 'error', 'silent'],
        describe: 'Sets the log level',
        default: DEFAULT_LOG_LEVEL,
        coerce: ((x: string) => x) as (x: string) => keyof typeof LogLevelMap,
      },
      config: {
        alias: 'c',
        type: 'string',
        describe: 'Path to config file',
        normalize: true,
        nargs: 1,
        requiresArg: true,
        defaultDescription: '(discovered automatically)',
      },
      'no-config': {
        type: 'boolean',
        describe: 'Disable config file discovery',
      },
    })
    .middleware(
      /**
       * Writes a startup message
       */
      () => {
        log.info(`${pkg.name} @ v${pkg.version} (Node.js ${process.version})`);
      },
    )
    .epilog(`Please report bugs at ${pkg.bugs?.url}`)
    .fail(
      /**
       * Custom failure handler so we can log nicely.
       */
      (msg: string | null, error) => {
        /**
         * yargs' default output if an "implication" fails (e.g., arg _A_ requires arg _B_) leaves much to be desired.
         *
         * @remarks Unfortunately, we do not have access to the parsed arguments object, since it may have failed parsing.
         * @param msg Implication failure message
         * @returns Whether the message was an implication failure
         */
        const handleImplicationFailure = (msg: string | null): boolean => {
          let match: RegExpMatchArray | null | undefined;
          if (!(match = msg?.match(IMPLICATIONS_FAILED_REGEX))) {
            return false;
          }
          const [, arg, missingArg] = match;
          log.error(`Argument "--${arg}" requires "--${missingArg}"; note that "--${arg}" may be enabled by default`);
          return true;
        };

        // if it is a DocutilsError, it has nothing to do with the CLI
        if (error instanceof DocutilsError) {
          log.error(error.message);
        } else {
          y.showHelp();

          if (!handleImplicationFailure(msg)) {
            log.error(`\n\n${msg ?? error.message}`);
          }
        }
        y.exit(1, error);
      },
    )
    .config(config)
    // at least one command is required (but not for --version or --help)
    .demandCommand(1)
    // fail if unknown option or command is provided
    .strict()
    .parseAsync();
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  // eslint-disable-next-line promise/prefer-await-to-then, promise/prefer-await-to-callbacks
  main().catch((err) => {
    log.error('Caught otherwise-unhandled rejection (this is probably a bug):', err);
  });
}
