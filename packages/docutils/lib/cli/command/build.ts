import {CommandModule, InferredOptionTypes, Options} from 'yargs';
import {buildReferenceDocs, buildSite, deploy, updateNav} from '../../builder';
import {NAME_BIN} from '../../constants';
import logger from '../../logger';
import {stopwatch} from '../../util';

const log = logger.withTag('build');

const NAME_GROUP_BUILD = 'Build Options:';
const NAME_GROUP_DEPLOY = 'Deployment Options:';
const NAME_GROUP_SERVE = 'Serve Options:';
const NAME_GROUP_BUILD_PATHS = 'Paths:';

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
    group: NAME_GROUP_BUILD_PATHS,
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
    group: NAME_GROUP_BUILD_PATHS,
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
    group: NAME_GROUP_BUILD_PATHS,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  'mkdocs-yml': {
    defaultDescription: './mkdocs.yml',
    description: 'Path to mkdocs.yml',
    group: NAME_GROUP_BUILD_PATHS,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  'typedoc-json': {
    defaultDescription: './typedoc.json',
    describe: 'Path to typedoc.json',
    group: NAME_GROUP_BUILD_PATHS,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    type: 'string',
  },
  all: {
    describe: 'Output all reference docs (not just Appium comands)',
    group: NAME_GROUP_BUILD,
    implies: 'site',
    type: 'boolean',
  },
  deploy: {
    describe: 'Commit HTML output',
    group: NAME_GROUP_DEPLOY,
    type: 'boolean',
    implies: 'site',
  },
  push: {
    describe: 'Push after deploy',
    group: NAME_GROUP_DEPLOY,
    type: 'boolean',
    implies: 'deploy',
  },
  branch: {
    alias: 'b',
    describe: 'Branch to commit to',
    implies: 'deploy',
    group: NAME_GROUP_DEPLOY,
    type: 'string',
    requiresArg: true,
    nargs: 1,
    defaultDescription: 'gh-pages',
  },
  remote: {
    alias: 'r',
    describe: 'Remote to push to',
    implies: ['deploy', 'push'],
    group: NAME_GROUP_DEPLOY,
    type: 'string',
    requiresArg: true,
    nargs: 1,
    defaultDescription: 'origin',
  },
  prefix: {
    describe: 'Subdirectory within <branch> to commit to',
    implies: ['deploy', 'branch'],
    group: NAME_GROUP_DEPLOY,
    type: 'string',
    nargs: 1,
    requiresArg: true,
  },
  message: {
    alias: 'm',
    describe: 'Commit message',
    implies: 'deploy',
    group: NAME_GROUP_DEPLOY,
    type: 'string',
    nargs: 1,
    requiresArg: true,
  },
  'deploy-version': {
    describe: 'Version (directory) to deploy build to',
    implies: 'deploy',
    group: NAME_GROUP_DEPLOY,
    type: 'string',
    nargs: 1,
    requiresArg: true,
    defaultDescription: '(derived from package.json)',
  },
  alias: {
    describe: 'Alias for the build (e.g., "latest"); triggers alias update',
    implies: 'deploy',
    group: NAME_GROUP_DEPLOY,
    type: 'string',
    nargs: 1,
    requiresArg: true,
    defaultDescription: 'latest',
  },
  rebase: {
    describe: 'Rebase <branch> with remote before deploy',
    implies: ['deploy', 'branch', 'remote'],
    group: NAME_GROUP_DEPLOY,
    type: 'boolean',
  },
  serve: {
    describe: 'Start development server',
    group: NAME_GROUP_SERVE,
    type: 'boolean',
  },
  port: {
    alias: 'p',
    describe: 'Development server port',
    group: NAME_GROUP_SERVE,
    type: 'number',
    defaultDescription: '8000',
    implies: 'serve',
    nargs: 1,
    requiresArg: true,
  },
  host: {
    alias: 'h',
    describe: 'Development server host',
    group: NAME_GROUP_SERVE,
    type: 'string',
    nargs: 1,
    requiresArg: true,
    implies: 'serve',
    defaultDescription: 'localhost',
  },
} as const;

opts as Record<string, Options>;
type BuildOptions = InferredOptionTypes<typeof opts>;

const buildCommand: CommandModule<{}, BuildOptions> = {
  command: 'build',
  describe: 'Build Appium extension documentation',
  builder: (yargs) =>
    yargs.options(opts).check((argv) => {
      // either this method doesn't provide camel-cased props, or the types are wrong.
      if (argv.deploy === true && argv['site-dir']) {
        log.error(
          `--site-dir is unsupported when running "${NAME_BIN} deploy"; use --prefix if needd, but remember that the default behavior is to deploy to the root of the branch (${argv.branch}) instead of a subdirectory`
        );
        return false;
      }
      return true;
    }),
  async handler(args) {
    const stop = stopwatch('build');
    log.debug('Build command called with args: %O', args);
    if (!args.site && !args.reference) {
      // specifically not a DocUtils error
      throw new Error(
        'Cannot use both --no-site (--site=false) and --no-reference (--reference=false)'
      );
    }
    if (args.reference) {
      await buildReferenceDocs(args);
    }
    if (args.site) {
      await updateNav(args);
      if (args.deploy) {
        await deploy(args);
      } else {
        await buildSite(args);
      }
    }
    log.success('Done! (total: %dms)', stop());
  },
};

export default buildCommand;
