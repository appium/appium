import _ from 'lodash';
import {CommandModule, InferredOptionTypes, Options} from 'yargs';
import {init} from '../../init';
import logger from '../../logger';
import {stopwatch} from '../../util';

const log = logger.withTag('init');

const NAME_GROUP_INIT_MKDOCS = 'MkDocs Config:';
const NAME_GROUP_INIT_PATHS = 'Paths:';
const NAME_GROUP_INIT_BEHAVIOR = 'Initialization Behavior:';

const opts = Object.freeze({
  copyright: {
    description: 'Copyright notice',
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
}) satisfies Record<string, Options>;

type InitOptions = InferredOptionTypes<typeof opts>;

export default {
  command: 'init',
  describe: 'Initialize package for doc generation',
  builder: opts,
  async handler(args) {
    const done = stopwatch('init');
    await init({...args, overwrite: args.force, cwd: args.dir});
    log.success('Done (%dms)', done());
  },
} as CommandModule<{}, InitOptions>;
