#!/usr/bin/env node

import _ from 'lodash';
import yargs from 'yargs/yargs';
import {hideBin} from 'yargs/helpers';
import {init} from './init';
import log from './logger';
import {DocutilsError} from './error';
import {LogLevel} from 'consola';
import {stopwatch} from './util';
import {buildReference} from './build';

const NAME_GROUP_INIT_BEHAVIOR = 'Initialization Behavior:';
const NAME_GROUP_INIT_MKDOCS = 'MkDocs Config:';
const NAME_GROUP_BUILD_REFERENCE = 'Build API:';
const NAME_GROUP_INIT_PATHS = 'Paths:';

const LogLevelName = {
  silent: LogLevel.Silent,
  error: LogLevel.Error,
  warn: LogLevel.Warn,
  info: LogLevel.Info,
  debug: LogLevel.Debug,
} as const;

export async function main(argv = hideBin(process.argv)) {
  const done = stopwatch('main');
  const y = yargs(argv);
  return await y
    .scriptName('appium-docs')
    .command(
      'build-reference',
      'Build API reference docs',
      (yargs) =>
        yargs.options({
          'typedoc-json': {
            requiresArg: true,
            nargs: 1,
            normalize: true,
            type: 'string',
            describe: 'Path to typedoc.json',
            defaultDescription: './typedoc.json',
            group: NAME_GROUP_BUILD_REFERENCE,
          },
          'package-json': {
            requiresArg: true,
            nargs: 1,
            normalize: true,
            type: 'string',
            describe: 'Path to package.json',
            defaultDescription: './package.json',
            group: NAME_GROUP_BUILD_REFERENCE,
          },
          'tsconfig-json': {
            requiresArg: true,
            nargs: 1,
            normalize: true,
            type: 'string',
            describe: 'Path to tsconfig.json',
            defaultDescription: './tsconfig.json',
            group: NAME_GROUP_BUILD_REFERENCE,
          },
          title: {
            requiresArg: true,
            nargs: 1,
            type: 'string',
            describe: 'Title of the API reference',
            defaultDescription: '(extension package name)',
            group: NAME_GROUP_BUILD_REFERENCE,
          },
        }),
      async (argv) => {
        await buildReference(argv);
      }
    )
    .command(
      'init [sources..]',
      'Initialize package for docs',
      (yargs) =>
        yargs
          .positional('source', {
            type: 'string',
            array: true,
            description: 'Source files to include in docs (globs OK)',
            default: 'lib',
            coerce: _.castArray,
          })
          .options({
            dir: {
              type: 'string',
              default: '.',
              normalize: true,
              description: 'Directory of package',
              defaultDescription: '(current directory)',
              group: NAME_GROUP_INIT_PATHS,
            },
            'python-path': {
              requiresArg: true,
              nargs: 1,
              type: 'string',
              description: 'Path to python 3 executable',
              normalize: true,
              defaultDescription: '(derived from shell)',
              group: NAME_GROUP_INIT_PATHS,
            },
            python: {
              type: 'boolean',
              description: 'Install Python dependencies if needed',
              default: true,
              group: NAME_GROUP_INIT_BEHAVIOR,
            },
            typedoc: {
              type: 'boolean',
              description: 'Create typedoc.json if needed',
              default: true,
              group: NAME_GROUP_INIT_BEHAVIOR,
            },
            typescript: {
              type: 'boolean',
              description: 'Create tsconfig.json if needed',
              default: true,
              group: NAME_GROUP_INIT_BEHAVIOR,
            },
            mkdocs: {
              type: 'boolean',
              description: 'Create mkdocs.yml if needed',
              default: true,
              group: NAME_GROUP_INIT_BEHAVIOR,
            },
            'mkdocs-path': {
              requiresArg: true,
              nargs: 1,
              type: 'string',
              description: 'Path to mkdocs.yml',
              normalize: true,
              defaultDescription: './mkdocs.yml',
              group: NAME_GROUP_INIT_PATHS,
            },
            'site-name': {
              requiresArg: true,
              nargs: 1,
              type: 'string',
              description: 'Name of site',
              defaultDescription: '(extension package name)',
              group: NAME_GROUP_INIT_MKDOCS,
            },
            'repo-url': {
              requiresArg: true,
              nargs: 1,
              type: 'string',
              description: 'URL of extension repository',
              defaultDescription: '(from package.json)',
              group: NAME_GROUP_INIT_MKDOCS,
            },
            'site-description': {
              requiresArg: true,
              nargs: 1,
              type: 'string',
              description: 'Site description',
              defaultDescription: '(from package.json)',
              group: NAME_GROUP_INIT_MKDOCS,
            },
            'repo-name': {
              requiresArg: true,
              nargs: 1,
              type: 'string',
              description: 'Name of extension repository',
              defaultDescription: '(derived from --repo-url)',
              group: NAME_GROUP_INIT_MKDOCS,
            },
            copyright: {
              requiresArg: true,
              nargs: 1,
              type: 'string',
              descripiton: 'Copyright notice',
              group: NAME_GROUP_INIT_MKDOCS,
            },
            'tsconfig-json': {
              requiresArg: true,
              nargs: 1,
              normalize: true,
              type: 'string',
              describe: 'Path to tsconfig.json',
              defaultDescription: './tsconfig.json',
              group: NAME_GROUP_INIT_PATHS,
            },
            'typedoc-json': {
              requiresArg: true,
              nargs: 1,
              normalize: true,
              type: 'string',
              describe: 'Path to typedoc.json',
              defaultDescription: './typedoc.json',
              group: NAME_GROUP_INIT_PATHS,
            },
            'package-json': {
              requiresArg: true,
              nargs: 1,
              normalize: true,
              type: 'string',
              describe: 'Path to package.json',
              defaultDescription: './package.json',
              group: NAME_GROUP_INIT_PATHS,
            },
            force: {
              type: 'boolean',
              describe: 'Overwrite existing configurations',
              alias: 'f',
              group: NAME_GROUP_INIT_BEHAVIOR,
            },
            'dry-run': {
              type: 'boolean',
              describe: 'Do not write any files; show what would be done',
              group: NAME_GROUP_INIT_BEHAVIOR,
            },
          }),
      async (argv) => {
        await init({...argv, overwrite: argv.force, cwd: argv.dir});
        log.success('Done (%dms)', done());
      }
    )
    .options({
      verbose: {
        alias: 'V',
        type: 'boolean',
        describe: 'Alias for --log-level=debug',
      },
      'log-level': {
        alias: 'L',
        choices: ['debug', 'info', 'warn', 'error', 'silent'],
        default: 'info',
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
        log.level = verbose ? LogLevelName.debug : LogLevelName[logLevel];
      }
    )
    .showHelpOnFail(false)
    .alias('v', 'version')
    .help()
    .strict()
    .parseAsync();
}

if (require.main === module) {
  // eslint-disable-next-line promise/prefer-await-to-then
  main().catch((e) => {
    if (e instanceof DocutilsError) {
      log.error(e.message);
    } else {
      log.error(e);
    }
    process.exitCode = 1;
  });
}
