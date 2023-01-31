import {CommandModule, InferredOptionTypes, Options} from 'yargs';
import {buildMkDocs} from '../../mkdocs';
import {buildReference} from '../../typedoc';
import logger from '../../logger';

const log = logger.withTag('build');

const NAME_GROUP_BUILD = 'Build API:';

const opts = {
  reference: {
    describe: 'Run TypeDoc command API reference build (Markdown)',
    group: NAME_GROUP_BUILD,
    type: 'boolean',
    default: true,
  },
  site: {
    describe: 'Run MkDocs build (HTML)',
    group: NAME_GROUP_BUILD,
    type: 'boolean',
    default: true,
  },
  'site-dir': {
    alias: 'd',
    describe: 'HTML output directory',
    group: NAME_GROUP_BUILD,
    nargs: 1,
    requiresArg: true,
    type: 'string',
    normalize: true,
    implies: 'site',
    defaultDescription: '(from mkdocs.yml)',
  },
  'package-json': {
    defaultDescription: './package.json',
    describe: 'Path to package.json',
    group: NAME_GROUP_BUILD,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  title: {
    defaultDescription: '(extension package name)',
    describe: 'Title of the API reference',
    group: NAME_GROUP_BUILD,
    nargs: 1,
    requiresArg: true,
    type: 'string',
  },
  'tsconfig-json': {
    defaultDescription: './tsconfig.json',
    describe: 'Path to tsconfig.json',
    group: NAME_GROUP_BUILD,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  'typedoc-json': {
    defaultDescription: './typedoc.json',
    describe: 'Path to typedoc.json',
    group: NAME_GROUP_BUILD,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
} as const;

opts as Record<string, Options>;
type BuildOptions = InferredOptionTypes<typeof opts>;

const buildCommand: CommandModule<{}, BuildOptions> = {
  command: 'build',
  describe: 'Build Appium extension documentation',
  builder: opts,
  async handler(args) {
    log.debug('Build command called with args: %O', args);
    if (!args.onlyWeb) {
      await buildReference(args);
    }
    if (!args.onlyReference) {
      await buildMkDocs(args);
    }
  },
};

export default buildCommand;
