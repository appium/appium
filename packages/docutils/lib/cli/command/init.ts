/**
 * Yargs command module for the `init` command.
 * @module
 */

import _ from 'lodash';
import type {CommandModule, InferredOptionTypes, Options} from 'yargs';
import {init} from '../../init';
import {getLogger} from '../../logger';
import {stopwatch} from '../../util';
import {checkMissingPaths} from '../check';

const log = getLogger('init');

enum InitCommandGroup {
  MkDocs = 'MkDocs Config:',
  Paths = 'Custom Paths:',
  Behavior = 'Initialization Behavior:',
}

/**
 * Note the groups here; _some_ opts are paths and would usually be checked via
 * {@linkcode checkMissingPaths}, but in this case we do not care if the path exists or not, because
 * we may create it.
 */
const opts = {
  copyright: {
    description: 'Copyright notice',
    group: InitCommandGroup.MkDocs,
    nargs: 1,
    requiresArg: true,
    type: 'string',
    implies: 'mkdocs',
  },
  dir: {
    default: '.',
    defaultDescription: '(current directory)',
    description: 'Directory of package',
    group: InitCommandGroup.Paths,
    normalize: true,
    type: 'string',
  },
  'dry-run': {
    describe: 'Do not write any files; show what would be done',
    group: InitCommandGroup.Behavior,
    type: 'boolean',
  },
  force: {
    alias: 'f',
    describe: 'Overwrite existing configurations',
    group: InitCommandGroup.Behavior,
    type: 'boolean',
  },
  include: {
    alias: 'i',
    array: true,
    coerce: (value: string | string[]) => _.castArray(value),
    description: 'Files to include in compilation (globs OK)',
    nargs: 1,
    group: InitCommandGroup.MkDocs,
    requiresArg: true,
    type: 'string',
    implies: 'mkdocs',
  },
  mkdocs: {
    default: true,
    description: 'Create mkdocs.yml if needed',
    group: InitCommandGroup.Behavior,
    type: 'boolean',
  },
  'mkdocs-yml': {
    defaultDescription: './mkdocs.yml',
    description: 'Path to new or existing mkdocs.yml',
    group: InitCommandGroup.MkDocs,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
    implies: 'mkdocs',
  },
  'package-json': {
    defaultDescription: './package.json',
    describe: 'Path to existing package.json',
    group: InitCommandGroup.Paths,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  python: {
    default: true,
    description: 'Install Python dependencies if needed',
    group: InitCommandGroup.Behavior,
    type: 'boolean',
  },
  'python-path': {
    defaultDescription: '(derived from shell)',
    description: 'Path to python 3 executable',
    group: InitCommandGroup.Paths,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
    implies: 'python',
  },
  'repo-name': {
    defaultDescription: '(derived from --repo-url)',
    description: 'Name of extension repository',
    group: InitCommandGroup.MkDocs,
    nargs: 1,
    requiresArg: true,
    type: 'string',
    implies: 'mkdocs',
  },
  'repo-url': {
    defaultDescription: '(from package.json)',
    description: 'URL of extension repository',
    group: InitCommandGroup.MkDocs,
    nargs: 1,
    requiresArg: true,
    type: 'string',
    implies: 'mkdocs',
  },
  'site-description': {
    defaultDescription: '(from package.json)',
    description: 'Site description',
    group: InitCommandGroup.MkDocs,
    nargs: 1,
    requiresArg: true,
    type: 'string',
    implies: 'mkdocs',
  },
  'site-name': {
    defaultDescription: '(extension package name)',
    description: 'Name of site',
    group: InitCommandGroup.MkDocs,
    nargs: 1,
    requiresArg: true,
    type: 'string',
    implies: 'mkdocs',
  },
  'tsconfig-json': {
    defaultDescription: './tsconfig.json',
    describe: 'Path to new or existing tsconfig.json',
    group: InitCommandGroup.Behavior,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
    implies: 'typescript',
  },
  typescript: {
    default: true,
    description: 'Create tsconfig.json if needed',
    group: InitCommandGroup.Behavior,
    type: 'boolean',
  },
  upgrade: {
    alias: 'up',
    describe: 'Only upgrade Python dependencies if out-of-date',
    group: InitCommandGroup.Behavior,
    type: 'boolean',
    conflicts: 'force',
    implies: 'python',
  },
} as const satisfies Record<string, Options>;

type InitOptions = InferredOptionTypes<typeof opts>;

export default {
  command: 'init',
  describe: 'Initialize package for doc generation',
  builder(yargs) {
    return yargs
      .options(opts)
      .check(async (argv) => checkMissingPaths(opts, InitCommandGroup.Paths, argv));
  },
  async handler(args) {
    const done = stopwatch('init');
    await init({...args, overwrite: args.force, cwd: args.dir});
    log.success('Done (%dms)', done());
  },
} as CommandModule<object, InitOptions>;
