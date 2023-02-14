import pluralize from 'pluralize';
import {CommandModule, InferredOptionTypes, Options} from 'yargs';
import {DocutilsError} from '../../error';
import {DocutilsValidator, ValidationKind} from '../../validate';
import logger from '../../logger';

const log = logger.withTag('validate');

const NAME_GROUP_VALIDATE = 'Validation Behavior:';
const NAME_GROUP_VALIDATE_PATHS = 'Paths:';

const opts = Object.freeze({
  mkdocs: {
    default: true,
    description: 'Validate MkDocs environment',
    group: NAME_GROUP_VALIDATE,
    type: 'boolean',
  },
  'mkdocs-yml': {
    defaultDescription: './mkdocs.yml',
    description: 'Path to mkdocs.yml',
    group: NAME_GROUP_VALIDATE_PATHS,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  'npm-path': {
    defaultDescription: '(derived from shell)',
    description: 'Path to npm executable',
    group: NAME_GROUP_VALIDATE_PATHS,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  python: {
    default: true,
    description: 'Validate Python 3 environment',
    group: NAME_GROUP_VALIDATE,
    type: 'boolean',
  },
  'python-path': {
    defaultDescription: '(derived from shell)',
    description: 'Path to python 3 executable',
    group: NAME_GROUP_VALIDATE_PATHS,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  'tsconfig-json': {
    defaultDescription: './tsconfig.json',
    describe: 'Path to tsconfig.json',
    group: NAME_GROUP_VALIDATE_PATHS,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  typedoc: {
    default: true,
    description: 'Validate TypoDoc environment',
    group: NAME_GROUP_VALIDATE,
    type: 'boolean',
  },
  'typedoc-json': {
    defaultDescription: './typedoc.json',
    describe: 'Path to typedoc.json',
    group: NAME_GROUP_VALIDATE_PATHS,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  typescript: {
    default: true,
    description: 'Validate TypeScript environment',
    group: NAME_GROUP_VALIDATE,
    type: 'boolean',
  },
}) satisfies Record<string, Options>;

type ValidateOptions = InferredOptionTypes<typeof opts>;

export default {
  command: 'validate',
  describe: 'Validate Environment',
  builder: opts,
  async handler(args) {
    if (!args.python && !args.typedoc && !args.typescript && !args.mkdocs) {
      // specifically not a DocutilsError
      throw new Error(
        'No validation targets specified; one or more of --python, --typescript, --typedoc or --mkdocs must be provided'
      );
    }

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
        `Validation failed with ${errorCount} ${pluralize('error', errorCount)}`
      );
    }
  },
} as CommandModule<{}, ValidateOptions>;
