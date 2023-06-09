/**
 * Yargs command module for the `build` command.
 * @module
 */

import path from 'node:path';
import type {CommandModule, InferredOptionTypes, Options} from 'yargs';
import {buildReferenceDocs, buildSite, deploy, updateNav} from '../../builder';
import {NAME_BIN} from '../../constants';
import {getLogger} from '../../logger';
import {stopwatch} from '../../util';
import {checkMissingPaths} from '../check';

const log = getLogger('build');

enum BuildCommandGroup {
  Build = 'Build Config:',
  Deploy = 'Deployment Config:',
  Serve = 'Dev Server Config:',
  BuildPaths = 'Custom Paths:',
}

const opts = {
  reference: {
    describe: 'Run TypeDoc command API reference build (Markdown)',
    group: BuildCommandGroup.Build,
    type: 'boolean',
    default: true,
  },
  site: {
    describe: 'Run MkDocs build (HTML)',
    group: BuildCommandGroup.Build,
    type: 'boolean',
    default: true,
  },
  'site-dir': {
    alias: 'd',
    describe: 'HTML output directory',
    group: BuildCommandGroup.Build,
    nargs: 1,
    requiresArg: true,
    type: 'string',
    normalize: true,
    coerce: path.resolve,
    implies: 'site',
    defaultDescription: '(from mkdocs.yml)',
  },
  'package-json': {
    defaultDescription: './package.json',
    describe: 'Path to package.json',
    group: BuildCommandGroup.BuildPaths,
    nargs: 1,
    normalize: true,
    coerce: path.resolve,
    requiresArg: true,
    type: 'string',
  },
  title: {
    defaultDescription: '(extension package name)',
    describe: 'Title of the API reference',
    group: BuildCommandGroup.Build,
    nargs: 1,
    requiresArg: true,
    type: 'string',
  },
  'tsconfig-json': {
    defaultDescription: './tsconfig.json',
    describe: 'Path to tsconfig.json',
    group: BuildCommandGroup.BuildPaths,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    coerce: path.resolve,
    type: 'string',
  },
  'mkdocs-yml': {
    defaultDescription: './mkdocs.yml',
    description: 'Path to mkdocs.yml',
    group: BuildCommandGroup.BuildPaths,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    coerce: path.resolve,
    type: 'string',
  },
  'typedoc-json': {
    defaultDescription: './typedoc.json',
    describe: 'Path to typedoc.json',
    group: BuildCommandGroup.BuildPaths,
    nargs: 1,
    normalize: true,
    requiresArg: true,
    coerce: path.resolve,
    type: 'string',
  },
  all: {
    describe: 'Output all reference docs (not just Appium comands)',
    group: BuildCommandGroup.Build,
    implies: 'site',
    type: 'boolean',
  },
  deploy: {
    describe: 'Commit HTML output to a branch using mike',
    group: BuildCommandGroup.Deploy,
    type: 'boolean',
    implies: 'site',
  },
  push: {
    describe: 'Push after deploy',
    group: BuildCommandGroup.Deploy,
    type: 'boolean',
    implies: 'deploy',
  },
  branch: {
    alias: 'b',
    describe: 'Branch to commit to',
    implies: 'deploy',
    group: BuildCommandGroup.Deploy,
    type: 'string',
    requiresArg: true,
    nargs: 1,
    defaultDescription: 'gh-pages',
  },
  remote: {
    alias: 'r',
    describe: 'Remote to push to',
    implies: 'push',
    group: BuildCommandGroup.Deploy,
    type: 'string',
    requiresArg: true,
    nargs: 1,
    defaultDescription: 'origin',
  },
  prefix: {
    describe: 'Subdirectory within <branch> to commit to',
    implies: 'branch',
    group: BuildCommandGroup.Deploy,
    type: 'string',
    nargs: 1,
    requiresArg: true,
  },
  message: {
    alias: 'm',
    describe: 'Commit message. Use "%s" for version placeholder',
    implies: 'deploy',
    group: BuildCommandGroup.Deploy,
    type: 'string',
    nargs: 1,
    requiresArg: true,
  },
  'deploy-version': {
    describe: 'Version (directory) to deploy build to',
    implies: 'deploy',
    group: BuildCommandGroup.Deploy,
    type: 'string',
    nargs: 1,
    requiresArg: true,
    defaultDescription: '(derived from package.json)',
  },
  alias: {
    describe: 'Alias for the build (e.g., "latest"); triggers alias update',
    implies: 'deploy',
    group: BuildCommandGroup.Deploy,
    type: 'string',
    nargs: 1,
    requiresArg: true,
    defaultDescription: 'latest',
  },
  rebase: {
    describe: 'Rebase <branch> with remote before deploy',
    implies: 'deploy',
    group: BuildCommandGroup.Deploy,
    type: 'boolean',
    defaultDescription: 'true',
  },
  serve: {
    describe: 'Start development server',
    group: BuildCommandGroup.Serve,
    type: 'boolean',
  },
  port: {
    alias: 'p',
    describe: 'Development server port',
    group: BuildCommandGroup.Serve,
    type: 'number',
    defaultDescription: '8000',
    implies: 'serve',
    nargs: 1,
    requiresArg: true,
  },
  host: {
    alias: 'h',
    describe: 'Development server host',
    group: BuildCommandGroup.Serve,
    type: 'string',
    nargs: 1,
    requiresArg: true,
    implies: 'serve',
    defaultDescription: 'localhost',
  },
} as const satisfies Record<string, Options>;

type BuildOptions = InferredOptionTypes<typeof opts>;

export default {
  command: 'build',
  describe: 'Build Appium extension documentation using TypeDoc & MkDocs',
  builder(yargs) {
    return yargs
      .options(opts)
      .check(async (argv) => {
        // either this method doesn't provide camel-cased props, or the types are wrong.
        if (argv.deploy === true && argv['site-dir']) {
          return `--site-dir is unsupported when running "${NAME_BIN} deploy"; use --prefix if needed, but remember that the default behavior is to deploy to the root of the branch (${argv.branch}) instead of a subdirectory`;
        }

        return await checkMissingPaths(opts, BuildCommandGroup.BuildPaths, argv);
      })
      .epilog(
        'For help with further configuration, see:\n  - MkDocs: https://www.mkdocs.org\n  - TypeDoc: https://typedoc.org\n  - Mike: https://github.com/jimporter/mike'
      );
  },
  async handler(args) {
    log.info('Building docs...');
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
} as CommandModule<object, BuildOptions>;
