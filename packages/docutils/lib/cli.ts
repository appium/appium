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
import {validate} from './validate';

const NAME_GROUP_INIT_BEHAVIOR = 'Initialization Behavior:';
const NAME_GROUP_INIT_MKDOCS = 'MkDocs Config:';
const NAME_GROUP_BUILD_REFERENCE = 'Build API:';
const NAME_GROUP_INIT_PATHS = 'Paths:';
const NAME_GROUP_VALIDATE = 'Validation:';

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
      'build',
      'Build docs',
      (yargs) => {
        return yargs.options({
          'mkdocs-path': {
            describe: 'Path to mkdocs.yml',
            normalize: true,
            type: 'string',
            nargs: 1,
            array: false,
          },
        });
      },
      async () => {}
    )
    .command(
      'validate',
      'Validate Environment',
      (yargs) =>
        yargs.options({
          python: {
            default: true,
            description: 'Validate Python 3 environment',
            group: NAME_GROUP_VALIDATE,
            type: 'boolean',
          },
          'python-path': {
            defaultDescription: '(derived from shell)',
            description: 'Path to python 3 executable',
            group: NAME_GROUP_VALIDATE,
            nargs: 1,
            normalize: true,
            requiresArg: true,
            type: 'string',
          },
          'tsconfig-json': {
            defaultDescription: './tsconfig.json',
            describe: 'Path to tsconfig.json',
            group: NAME_GROUP_VALIDATE,
            nargs: 1,
            normalize: true,
            requiresArg: true,
            type: 'string',
          },
          typedoc: {
            default: true,
            description: 'Validate TypoDoc config',
            group: NAME_GROUP_VALIDATE,
            type: 'boolean',
          },
          'typedoc-json': {
            defaultDescription: './typedoc.json',
            describe: 'Path to typedoc.json',
            group: NAME_GROUP_VALIDATE,
            nargs: 1,
            normalize: true,
            requiresArg: true,
            type: 'string',
          },
          typescript: {
            default: true,
            description: 'Validate TypeScript config',
            group: NAME_GROUP_VALIDATE,
            type: 'boolean',
          },
        }),
      async (argv) => {
        if (!argv.python && !argv.typedoc && !argv.typescript) {
          throw new Error(
            'No validation targets specified; one or more of --python, --typescript or --typedoc must be provided'
          );
        }
        await validate(argv);
      }
    )
    .command(
      'build-reference',
      'Build API reference docs',
      (yargs) =>
        yargs.options({
          'package-json': {
            defaultDescription: './package.json',
            describe: 'Path to package.json',
            group: NAME_GROUP_BUILD_REFERENCE,
            nargs: 1,
            normalize: true,
            requiresArg: true,
            type: 'string',
          },
          title: {
            defaultDescription: '(extension package name)',
            describe: 'Title of the API reference',
            group: NAME_GROUP_BUILD_REFERENCE,
            nargs: 1,
            requiresArg: true,
            type: 'string',
          },
          'tsconfig-json': {
            defaultDescription: './tsconfig.json',
            describe: 'Path to tsconfig.json',
            group: NAME_GROUP_BUILD_REFERENCE,
            nargs: 1,
            normalize: true,
            requiresArg: true,
            type: 'string',
          },
          'typedoc-json': {
            defaultDescription: './typedoc.json',
            describe: 'Path to typedoc.json',
            group: NAME_GROUP_BUILD_REFERENCE,
            nargs: 1,
            normalize: true,
            requiresArg: true,
            type: 'string',
          },
        }),
      async (argv) => {
        await buildReference(argv);
      }
    )
    .command(
      'init',
      'Initialize package for docs',
      (yargs) =>
        yargs.options({
          copyright: {
            descripiton: 'Copyright notice',
            group: NAME_GROUP_INIT_MKDOCS,
            nargs: 1,
            requiresArg: true,
            type: 'string',
          },
          dir: {
            default: '.',
            defaultDescription: '(current directory)',
            description: 'Directory of package',
            group: NAME_GROUP_INIT_PATHS,
            normalize: true,
            type: 'string',
          },
          'dry-run': {
            describe: 'Do not write any files; show what would be done',
            group: NAME_GROUP_INIT_BEHAVIOR,
            type: 'boolean',
          },
          force: {
            alias: 'f',
            describe: 'Overwrite existing configurations',
            group: NAME_GROUP_INIT_BEHAVIOR,
            type: 'boolean',
          },
          include: {
            alias: 'i',
            array: true,
            coerce: (value: string | string[]) => _.castArray(value),
            description: 'Files to include in compilation (globs OK)',
            nargs: 1,
            requiresArg: true,
            type: 'string',
          },
          mkdocs: {
            default: true,
            description: 'Create mkdocs.yml if needed',
            group: NAME_GROUP_INIT_BEHAVIOR,
            type: 'boolean',
          },
          'mkdocs-yml': {
            defaultDescription: './mkdocs.yml',
            description: 'Path to mkdocs.yml',
            group: NAME_GROUP_INIT_PATHS,
            nargs: 1,
            normalize: true,
            requiresArg: true,
            type: 'string',
          },
          'package-json': {
            defaultDescription: './package.json',
            describe: 'Path to package.json',
            group: NAME_GROUP_INIT_PATHS,
            nargs: 1,
            normalize: true,
            requiresArg: true,
            type: 'string',
          },
          python: {
            default: true,
            description: 'Install Python dependencies if needed',
            group: NAME_GROUP_INIT_BEHAVIOR,
            type: 'boolean',
          },
          'python-path': {
            defaultDescription: '(derived from shell)',
            description: 'Path to python 3 executable',
            group: NAME_GROUP_INIT_PATHS,
            nargs: 1,
            normalize: true,
            requiresArg: true,
            type: 'string',
          },
          'repo-name': {
            defaultDescription: '(derived from --repo-url)',
            description: 'Name of extension repository',
            group: NAME_GROUP_INIT_MKDOCS,
            nargs: 1,
            requiresArg: true,
            type: 'string',
          },
          'repo-url': {
            defaultDescription: '(from package.json)',
            description: 'URL of extension repository',
            group: NAME_GROUP_INIT_MKDOCS,
            nargs: 1,
            requiresArg: true,
            type: 'string',
          },
          'site-description': {
            defaultDescription: '(from package.json)',
            description: 'Site description',
            group: NAME_GROUP_INIT_MKDOCS,
            nargs: 1,
            requiresArg: true,
            type: 'string',
          },
          'site-name': {
            defaultDescription: '(extension package name)',
            description: 'Name of site',
            group: NAME_GROUP_INIT_MKDOCS,
            nargs: 1,
            requiresArg: true,
            type: 'string',
          },
          'tsconfig-json': {
            defaultDescription: './tsconfig.json',
            describe: 'Path to tsconfig.json',
            group: NAME_GROUP_INIT_PATHS,
            nargs: 1,
            normalize: true,
            requiresArg: true,
            type: 'string',
          },
          typedoc: {
            default: true,
            description: 'Create typedoc.json if needed',
            group: NAME_GROUP_INIT_BEHAVIOR,
            type: 'boolean',
          },
          'typedoc-json': {
            defaultDescription: './typedoc.json',
            describe: 'Path to typedoc.json',
            group: NAME_GROUP_INIT_PATHS,
            nargs: 1,
            normalize: true,
            requiresArg: true,
            type: 'string',
          },
          typescript: {
            default: true,
            description: 'Create tsconfig.json if needed',
            group: NAME_GROUP_INIT_BEHAVIOR,
            type: 'boolean',
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
