#!/usr/bin/env node


/**
 * Main CLI entry point for `@appium/docutils`
 * @module
 */

import {getLogger} from '../logger';

import {fs} from '@appium/support';
import _ from 'lodash';
// eslint-disable-next-line import/named
import {sync as readPkg} from 'read-pkg';
import {hideBin} from 'yargs/helpers';
import yargs from 'yargs/yargs';
import {DEFAULT_LOG_LEVEL, LogLevelMap, NAME_BIN} from '../constants';
import {DocutilsError} from '../error';
import {build, init, validate} from './command';
import {findConfig} from './config';

const pkg = readPkg({cwd: fs.findRoot(__dirname)});
const log = getLogger('cli');
const IMPLICATIONS_FAILED_REGEX = /implications\s+failed:\n\s*(.+)\s->\s(.+)$/i;

export async function main(argv = hideBin(process.argv)) {
  const config = await findConfig(argv);

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
        coerce: _.identity as (x: string) => keyof typeof LogLevelMap,
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
      }
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
          log.error(
            `Argument "--${arg}" requires "--${missingArg}"; note that "--${arg}" may be enabled by default`
          );
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
      }
    )
    .config(config)
    // at least one command is required (but not for --version or --help)
    .demandCommand(1)
    // fail if unknown option or command is provided
    .strict()
    .parseAsync();
}

if (require.main === module) {
  // eslint-disable-next-line promise/prefer-await-to-then, promise/prefer-await-to-callbacks
  main().catch((err) => {
    log.error('Caught otherwise-unhandled rejection (this is probably a bug):', err);
  });
}
