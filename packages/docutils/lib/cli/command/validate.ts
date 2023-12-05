/**
 * Yargs command module for the `validate` command.
 * @module
 */

import {util} from '@appium/support';
import type {CommandModule, InferredOptionTypes, Options} from 'yargs';
import {DocutilsError} from '../../error';
import {DocutilsValidator, ValidationKind} from '../../validate';
import {getLogger} from '../../logger';
import {checkMissingPaths} from '../check';

const log = getLogger('validate');

enum ValidateCommandGroup {
  Behavior = 'Validation Behavior:',
  Paths = 'Custom Paths:',
}

const opts = {
  mkdocs: {
    default: true,
    description: 'Validate MkDocs environment',
    group: ValidateCommandGroup.Behavior,
    type: 'boolean',
  },
  'mkdocs-yml': {
    defaultDescription: './mkdocs.yml',
    description: 'Path to mkdocs.yml',
    group: ValidateCommandGroup.Paths,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  'npm-path': {
    defaultDescription: '(derived from shell)',
    description: 'Path to npm executable',
    group: ValidateCommandGroup.Paths,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  python: {
    default: true,
    description: 'Validate Python 3 environment',
    group: ValidateCommandGroup.Behavior,
    type: 'boolean',
  },
  'python-path': {
    defaultDescription: '(derived from shell)',
    description: 'Path to python3 executable',
    group: ValidateCommandGroup.Paths,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  'tsconfig-json': {
    defaultDescription: './tsconfig.json',
    describe: 'Path to tsconfig.json',
    group: ValidateCommandGroup.Paths,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  typescript: {
    default: true,
    description: 'Validate TypeScript environment',
    group: ValidateCommandGroup.Behavior,
    type: 'boolean',
  },
} as const satisfies Record<string, Options>;

type ValidateOptions = InferredOptionTypes<typeof opts>;

export default {
  command: 'validate',
  describe: 'Validate Environment',
  builder(yargs) {
    return yargs.options(opts).check(async (argv) => {
      if (!argv.python && !argv.typescript && !argv.mkdocs) {
        return 'No validation targets specified; one or more of --python, --typescript or --mkdocs must be provided';
      }
      return checkMissingPaths(opts, ValidateCommandGroup.Paths, argv);
    });
  },
  async handler(args) {
    let errorCount = 0;
    const validator = new DocutilsValidator(args)
      .once(DocutilsValidator.BEGIN, (kinds: ValidationKind[]) => {
        log.info(`Validating: ${kinds.join(', ')}`);
      })
      .once(DocutilsValidator.END, (errCount: number) => {
        errorCount = errCount;
      })
      .on(DocutilsValidator.FAILURE, (err: DocutilsError) => {
        log.error(err.message);
      })
      .on(DocutilsValidator.SUCCESS, (msg: string) => {
        log.success(msg);
      });

    await validator.validate();

    if (errorCount) {
      throw new DocutilsError(
        `Validation failed with ${errorCount} ${util.pluralize('error', errorCount)}`,
      );
    }
  },
} as CommandModule<object, ValidateOptions>;
