import {CommandModule, InferredOptionTypes, Options} from 'yargs';
import {buildReferenceDocs, buildSite} from '../../builder';
import logger from '../../logger';
import {updateNav} from '../../nav';
import {stopwatch} from '../../util';

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
  'reference-header': {
    describe: 'Navigation header for API reference',
    default: 'Reference',
    group: NAME_GROUP_BUILD,
    nargs: 1,
    requiresArg: true,
    type: 'string',
  },
  'no-reference-header': {
    describe: 'Do not add a navigation header for API reference',
    group: NAME_GROUP_BUILD,
    type: 'boolean',
  },
} as const;

opts as Record<string, Options>;
type BuildOptions = InferredOptionTypes<typeof opts>;

const buildCommand: CommandModule<{}, BuildOptions> = {
  command: 'build',
  describe: 'Build Appium extension documentation',
  builder: opts,
  async handler(args) {
    const stop = stopwatch('build');
    log.debug('Build command called with args: %O', args);
    if (!args.site && !args.reference) {
      // specifically not a DocUtils error
      throw new Error(
        'Cannot use both --no-site (--site=false) and --no-reference (--reference=false)'
      );
    }
    if (args.site) {
      await buildReferenceDocs(args);
    }
    if (args.reference) {
      await updateNav(args);
      await buildSite(args);
    }
    log.success('Done! (total: %dms)', stop());
  },
};

export default buildCommand;
