import {CommandModule, InferredOptionTypes, Options} from 'yargs';
import {validate} from '../../validate';

const NAME_GROUP_VALIDATE = 'Validation:';

const opts = {
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
} as const;
opts as Record<string, Options>;
type ValidateOptions = InferredOptionTypes<typeof opts>;
const validateCommand: CommandModule<{}, ValidateOptions> = {
  command: 'validate',
  describe: 'Validate Environment',
  builder: opts,
  async handler(args) {
    if (!args.python && !args.typedoc && !args.typescript) {
      // specifically not a DocutilsError
      throw new Error(
        'No validation targets specified; one or more of --python, --typescript or --typedoc must be provided'
      );
    }
    await validate(args);
  },
};

export default validateCommand;
