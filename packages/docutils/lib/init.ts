/**
 * Scaffolding functions for CLI `init` command
 *
 * @module
 */

import * as JSON5 from 'json5';
import {NAME_MKDOCS_YML, NAME_TSCONFIG_JSON, NAME_PYTHON, PIP_ENV_VARS, REQUIREMENTS_TXT_PATH} from './constants';
import YAML from 'yaml';
import {exec} from 'teen_process';
import {Simplify} from 'type-fest';
import {DocutilsError} from './error';
import {createScaffoldTask, ScaffoldTaskOptions} from './scaffold';
import type { ScaffoldTask } from './scaffold';
import {getLogger} from './logger';
import {MkDocsYml, TsConfigJson} from './model';
import _ from 'lodash';
import {findPython, stringifyJson5, stringifyYaml} from './fs';

/**
 * Data for the base `mkdocs.yml` file
 */
const BASE_MKDOCS_YML: Readonly<MkDocsYml> = Object.freeze({
  INHERIT: './node_modules/@appium/docutils/base-mkdocs.yml',
  docs_dir: 'docs',
  site_dir: 'site',
});

/**
 * Data for the base `tsconfig.json` file
 */
const BASE_TSCONFIG_JSON: Readonly<TsConfigJson> = Object.freeze({
  $schema: 'https://json.schemastore.org/tsconfig',
  extends: '@appium/tsconfig/tsconfig.json',
  compilerOptions: {
    outDir: 'build',
  },
});

const log = getLogger('init');
const dryRunLog = getLogger('dry-run', log);

/**
 * Files included, by default, in `tsconfig.json`
 */
const DEFAULT_INCLUDE = ['lib', 'test', 'index.js'];
/**
 * Function which scaffolds a `tsconfig.json` file
 */
export const initTsConfigJson = createScaffoldTask<InitTsConfigOptions, TsConfigJson>(
  NAME_TSCONFIG_JSON,
  BASE_TSCONFIG_JSON,
  'TypeScript configuration',
  {
    /**
     * Merges the contents of the `include` property with any passed on the CLI. If neither exists,
     * uses the default set of includes.
     * @param content Parsed and/or scaffolded `tsconfig.json`
     * @param opts Options specific to this task
     * @returns `tsconfig.json` content with potentially-modified `include` prop
     */
    transform: (content, {include}) => {
      include = [...(content.include ?? include ?? [])];
      if (_.isEmpty(include)) {
        include = [...DEFAULT_INCLUDE];
      }
      return {
        ...content,
        include: _.uniq(include),
      };
    },
    deserialize: JSON5.parse,
    serialize: stringifyJson5,
  },
);

/**
 * Function which scaffolds an `mkdocs.yml` file
 */
export const initMkDocs: ScaffoldTask<InitMkDocsOptions, MkDocsYml> = createScaffoldTask<InitMkDocsOptions, MkDocsYml>(
  NAME_MKDOCS_YML,
  BASE_MKDOCS_YML,
  'MkDocs configuration',
  {
    deserialize: YAML.parse,
    serialize: stringifyYaml,
    transform: (content, opts, pkg) => {
      let siteName = opts.siteName ?? content.site_name;
      if (!siteName) {
        siteName = pkg.name ?? '(no name)';
        if (siteName) {
          log.info('Using site name from package.json: %s', siteName);
        }
      }
      let repoUrl: string | undefined = opts.repoUrl ?? content.repo_url;
      if (!repoUrl) {
        repoUrl = pkg.repository?.url;
        if (repoUrl) {
          log.info('Using repo URL from package.json: %s', repoUrl);
        }
      }
      let repoName = opts.repoName ?? content.repo_name;
      if (repoUrl && !repoName) {
        let {pathname} = new URL(repoUrl);
        pathname = pathname.slice(1);
        const pathparts = pathname.split('/');
        const owner = pathparts[0];
        let repo = pathparts[1];
        repo = repo.replace(/\.git$/, '');
        repoName = [owner, repo].join('/');
        if (repoName) {
          log.info('Using repo name from package.json: %s', repoName);
        }
      }
      let siteDescription = opts.siteDescription ?? content.site_description;
      if (!siteDescription) {
        siteDescription = pkg.description;
        if (siteDescription) {
          log.info('Using site description URL from package.json: %s', siteDescription);
        }
      }
      return {
        ...content,
        site_name: siteName,
        repo_url: repoUrl,
        repo_name: repoName,
        site_description: siteDescription,
      };
    },
  },
);

/**
 * Installs Python dependencies
 * @param opts Options
 */
export async function initPython({
  pythonPath,
  dryRun = false,
  upgrade = false,
}: InitPythonOptions = {}): Promise<void> {
  pythonPath = pythonPath ?? (await findPython()) ?? NAME_PYTHON;

  const args = ['-m', 'pip', 'install', '-r', REQUIREMENTS_TXT_PATH];
  if (upgrade) {
    args.push('--upgrade');
  }
  if (dryRun) {
    dryRunLog.info(
      'Would execute command: %s %s (environment variables: %s)',
      pythonPath,
      args.join(' '),
      PIP_ENV_VARS,
    );
  } else {
    log.debug('Executing command: %s %s (environment variables: %s)',
      pythonPath,
      args.join(' '),
      PIP_ENV_VARS,
    );
    log.info('Installing Python dependencies...');
    try {
      const result = await exec(pythonPath, args, {env: PIP_ENV_VARS, shell: true});
      const {code, stdout} = result;
      if (code !== 0) {
        throw new DocutilsError(`Could not install Python dependencies. Reason: ${stdout}`);
      }
    } catch (err) {
      throw new DocutilsError(
        `Could not install Python dependencies. Reason: ${(err as Error).message}`,
      );
    }
  }
  log.success('Installed Python dependencies (or dependencies already installed)');
}

/**
 * Options for {@linkcode initMkDocs}
 */
export interface InitMkDocsOptions extends ScaffoldTaskOptions {
  copyright?: string;
  repoName?: string;
  repoUrl?: string;
  siteDescription?: string;
  siteName?: string;
}

/**
 * Main handler for `init` command.
 *
 * This runs tasks in serial; it _could_ run in parallel, but it has deleterious effects upon
 * console output which would need mitigation.
 */
export async function init({
  typescript,
  python,
  tsconfigJson: tsconfigJsonPath,
  packageJson: packageJsonPath,
  overwrite,
  include,
  mkdocs,
  mkdocsYml: mkdocsYmlPath,
  siteName,
  repoName,
  repoUrl,
  copyright,
  dryRun,
  cwd,
  pythonPath,
  upgrade,
}: InitOptions = {}): Promise<void> {
  if (typescript && !upgrade) {
    await initTsConfigJson({
      dest: tsconfigJsonPath,
      packageJson: packageJsonPath,
      overwrite,
      include,
      dryRun,
      cwd,
    });
  }

  if (python) {
    await initPython({pythonPath, dryRun, upgrade});
  }

  if (mkdocs && !upgrade) {
    await initMkDocs({
      dest: mkdocsYmlPath,
      cwd,
      siteName,
      repoUrl,
      repoName,
      copyright,
      packageJson: packageJsonPath,
      overwrite,
      dryRun,
    });
  }
}

export interface InitTsConfigOptions extends ScaffoldTaskOptions {
  /**
   * List of source files (globs supported); typically `src` or `lib`
   */
  include?: string[];
}
export interface InitPythonOptions extends ScaffoldTaskOptions {
  /**
   * Path to `python` (v3.x) executable
   */
  pythonPath?: string;

  /**
   * If true, upgrade only
   */
  upgrade?: boolean;
}

/**
 * Options for `init` command handler
 *
 * The props of the various "path" options are rewritten as `dest` for the scaffold tasks functions.
 */
export type InitOptions = Simplify<
  Omit<InitPythonOptions & InitTsConfigOptions & InitMkDocsOptions, 'dest'> & {
    /**
     * If `true` will initialize a `tsconfig.json` file
     */
    typescript?: boolean;
    /**
     * If `true` will install Python deps
     */
    python?: boolean;
    /**
     * If `true` will initialize a `mkdocs.yml` file
     */
    mkdocs?: boolean;
    /**
     * Path to new or existing `tsconfig.json` file
     */
    tsconfigJson?: string;
    /**
     * Path to existing `package.json` file
     */
    packageJson?: string;
    /**
     * Path to new or existing `mkdocs.yml` file
     */
    mkdocsYml?: string;

    /**
     * If `true`, upgrade only
     */
    upgrade?: boolean;
  }
>;
