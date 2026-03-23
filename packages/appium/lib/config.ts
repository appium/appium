/* eslint-disable no-console */
import _ from 'lodash';
import {system, fs, npm} from '@appium/support';
import axios from 'axios';
import {exec} from 'teen_process';
import * as semver from 'semver';
import os from 'node:os';
import {npmPackage} from './utils';
import B from 'bluebird';
import {getDefaultsForSchema, getAllArgSpecs} from './schema/schema';
import type {BuildInfo, Args} from 'appium/types';
import type {ReadConfigFileResult} from './config-file';

export const APPIUM_VER = npmPackage.version;
const ENGINES = npmPackage.engines as Record<string, string>;
const MIN_NODE_VERSION = ENGINES.node;
export const rootDir = fs.findRoot(__dirname);

const GIT_BINARY = `git${system.isWindows() ? '.exe' : ''}`;
const GITHUB_API = 'https://api.github.com/repos/appium/appium';

const BUILD_INFO: BuildInfo = {
  version: APPIUM_VER,
};

/**
 * Update mutable build info metadata from local git or GitHub fallback.
 */
export async function updateBuildInfo(useGithubApiFallback = false): Promise<void> {
  const sha = await getGitRev(useGithubApiFallback);
  if (!sha) {
    return;
  }
  BUILD_INFO['git-sha'] = sha;
  const buildTimestamp = await getGitTimestamp(sha, useGithubApiFallback);
  if (buildTimestamp) {
    BUILD_INFO.built = buildTimestamp;
  }
}

/**
 * Prints server debug info to stdout.
 */
export async function showDebugInfo({driverConfig, pluginConfig, appiumHome}: DebugInfoInput): Promise<void> {
  const getNpmVersion = async (): Promise<string> => {
    const {stdout} = await npm.exec('--version', [], {cwd: process.cwd()});
    return _.trim(stdout);
  };
  const findNpmLocation = async (): Promise<string> =>
    await fs.which(system.isWindows() ? 'npm.cmd' : 'npm');

  const [npmVersion, npmLocation] = await B.all([
    ...[getNpmVersion, findNpmLocation].map((f) => getSafeResult(f, 'unknown')),
    updateBuildInfo() as Promise<unknown>,
  ]);

  const debugInfo = {
    os: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      homedir: os.homedir(),
      username: os.userInfo().username,
    },
    node: {
      version: process.version,
      arch: process.arch,
      cwd: process.cwd(),
      argv: process.argv,
      env: process.env,
      npm: {
        location: npmLocation,
        version: npmVersion,
      },
    },
    appium: {
      location: rootDir,
      homedir: appiumHome,
      build: getBuildInfo(),
      drivers: driverConfig.installedExtensions,
      plugins: pluginConfig.installedExtensions,
    },
  };
  console.log(JSON.stringify(debugInfo, null, 2));
}

/**
 * Returns the current git commit SHA for this Appium checkout.
 *
 * Attempts to read from local git first; when unavailable and fallback is enabled,
 * queries the GitHub API for the tag matching the current Appium version.
 */
export async function getGitRev(useGithubApiFallback = false): Promise<string | null> {
  const fullGitPath = await getFullGitPath();
  if (fullGitPath) {
    try {
      const {stdout} = await exec(fullGitPath, ['rev-parse', 'HEAD'], {
        cwd: __dirname,
      });
      return stdout.trim();
    } catch {}
  }

  if (!useGithubApiFallback) {
    return null;
  }

  // If the package folder is not a valid git repository
  // then fetch the corresponding tag info from GitHub
  try {
    return (
      await axios.get(`${GITHUB_API}/git/refs/tags/appium@${APPIUM_VER}`, {
        headers: {
          'User-Agent': `Appium ${APPIUM_VER}`,
        },
      })
    ).data?.object?.sha;
  } catch {}
  return null;
}

/**
 * Mutable object containing Appium build information. By default it
 * only contains the Appium version, but is updated with the build timestamp
 * and git commit hash asynchronously as soon as `updateBuildInfo` is called
 * and succeeds.
 */
export function getBuildInfo(): BuildInfo {
  return BUILD_INFO;
}

/**
 * @throws {Error} If Node version is outside of the supported range
 */
export function checkNodeOk(): void {
  const version = getNodeVersion();
  if (!semver.satisfies(version, MIN_NODE_VERSION)) {
    throw new Error(`Node version must be at least ${MIN_NODE_VERSION}; current is ${version.version}`);
  }
}

/**
 * Prints the current build info JSON to stdout.
 *
 * This updates build metadata first (using GitHub fallback) and then logs the
 * resulting {@link BuildInfo} object.
 */
export async function showBuildInfo(): Promise<void> {
  await updateBuildInfo(true);
  console.log(JSON.stringify(getBuildInfo()));
}

/**
 * Returns k/v pairs of server arguments which are _not_ the defaults.
 */
export function getNonDefaultServerArgs(parsedArgs: Args): Args {
  /**
   * Flattens parsed args into a single level object for comparison with
   * flattened defaults across server args and extension args.
   */
  const flatten = (args: Args): Record<string, FlattenedArg> => {
    const argSpecs = getAllArgSpecs();
    const flattened = _.reduce(
      [...argSpecs.values()],
      (acc: Record<string, FlattenedArg>, argSpec: {dest: string}) => {
        if (_.has(args, argSpec.dest)) {
          acc[argSpec.dest] = {value: _.get(args, argSpec.dest), argSpec};
        }
        return acc;
      },
      {}
    );

    return flattened;
  };

  const args = flatten(parsedArgs);

  // hopefully these function names are descriptive enough
  const typesDiffer = (dest: string): boolean =>
    typeof args[dest].value !== typeof defaultsFromSchema[dest];

  const defaultValueIsArray = (dest: string): boolean => _.isArray(defaultsFromSchema[dest]);

  const argsValueIsArray = (dest: string): boolean => _.isArray(args[dest].value);

  const arraysDiffer = (dest: string): boolean =>
    _.gt(_.size(_.difference(args[dest].value as any[], defaultsFromSchema[dest] as any[])), 0);

  const valuesDiffer = (dest: string): boolean => args[dest].value !== defaultsFromSchema[dest];

  const defaultIsDefined = (dest: string): boolean => !_.isUndefined(defaultsFromSchema[dest]);

  // note that `_.overEvery` is like an "AND", and `_.overSome` is like an "OR"
  const argValueNotArrayOrArraysDiffer = _.overSome([_.negate(argsValueIsArray), arraysDiffer]);

  const defaultValueNotArrayAndValuesDiffer = _.overEvery([
    _.negate(defaultValueIsArray),
    valuesDiffer,
  ]);

  /**
   * This used to be a hideous conditional, but it's broken up into a hideous function instead.
   * hopefully this makes things a little more understandable.
   * - checks if the default value is defined
   * - if so, and the default is not an array:
   *   - ensures the types are the same
   *   - ensures the values are equal
   * - if so, and the default is an array:
   *   - ensures the args value is an array
   *   - ensures the args values do not differ from the default values
   */
  const isNotDefault = _.overEvery([
    defaultIsDefined,
    _.overSome([
      typesDiffer,
      _.overEvery([defaultValueIsArray, argValueNotArrayOrArraysDiffer]),
      defaultValueNotArrayAndValuesDiffer,
    ]),
  ]);

  const defaultsFromSchema = getDefaultsForSchema(true) as Record<string, unknown>;

  return _.reduce(
    _.pickBy(args, (_v, key) => isNotDefault(key)),
    // explodes the flattened object back into nested one
    (acc: Args, {value, argSpec}: FlattenedArg) => _.set(acc, argSpec.dest, value),
    {} as Args
  );
}

/**
 * Shows a breakdown of the current config after CLI params, config file loaded & defaults applied.
 *
 * The actual shape of `preConfigParsedArgs` and `defaults` does not matter for the purposes of this
 * function, but it's intended to be called with values of type {@link ParsedArgs} and
 * `DefaultValues<true>`, respectively.
 */
export function showConfig(
  nonDefaultPreConfigParsedArgs: Partial<Args>,
  configResult: ReadConfigFileResult,
  defaults: Partial<Args>,
  parsedArgs: Args
): void {
  console.log('Appium Configuration\n');
  console.log('from defaults:\n');
  console.dir(compactConfig(defaults));
  if (configResult.config) {
    console.log(`\nfrom config file at ${configResult.filepath}:\n`);
    console.dir(compactConfig(configResult.config));
  } else {
    console.log(`\n(no configuration file loaded)`);
  }
  const compactedNonDefaultPreConfigArgs = compactConfig(nonDefaultPreConfigParsedArgs);
  if (_.isEmpty(compactedNonDefaultPreConfigArgs)) {
    console.log(`\n(no CLI parameters provided)`);
  } else {
    console.log('\nvia CLI or function call:\n');
    console.dir(compactedNonDefaultPreConfigArgs);
  }
  console.log('\nfinal configuration:\n');
  console.dir(compactConfig(parsedArgs));
}

/**
 * Ensures a directory exists and (optionally) is writeable.
 *
 * If the directory does not exist, this attempts to create it recursively.
 *
 * @throws {Error}
 */
export async function requireDir(
  root: string,
  requireWriteable = true,
  displayName = 'folder path'
): Promise<void> {
  let stat;
  try {
    stat = await fs.stat(root);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') {
      try {
        await fs.mkdir(root, {recursive: true});
        return;
      } catch {}
    }
    throw new Error(`The ${displayName} '${root}' must exist and be a valid directory`);
  }
  if (stat && !stat.isDirectory()) {
    throw new Error(`The ${displayName} '${root}' must be a valid directory`);
  }
  if (requireWriteable) {
    try {
      await fs.access(root, fs.constants.W_OK);
    } catch {
      throw new Error(
        `The ${displayName} '${root}' must be writeable for the current user account '${os.userInfo().username}'`
      );
    }
  }
}

function getNodeVersion(): semver.SemVer {
  return semver.coerce(process.version) as semver.SemVer;
}

const getFullGitPath = _.memoize(async function getFullGitPath(): Promise<string | null> {
  try {
    return await fs.which(GIT_BINARY);
  } catch {
    return null;
  }
});

async function getGitTimestamp(commitSha: string, useGithubApiFallback = false): Promise<string | null> {
  const fullGitPath = await getFullGitPath();
  if (fullGitPath) {
    try {
      const {stdout} = await exec(fullGitPath, ['show', '-s', '--format=%ci', commitSha], {
        cwd: __dirname,
      });
      return stdout.trim();
    } catch {}
  }

  if (!useGithubApiFallback) {
    return null;
  }

  try {
    return (
      await axios.get(`${GITHUB_API}/git/tags/${commitSha}`, {
        headers: {
          'User-Agent': `Appium ${APPIUM_VER}`,
        },
      })
    ).data?.tagger?.date;
  } catch {}
  return null;
}

/**
 * Compacts an object for {@link showConfig}:
 * 1. Removes `subcommand` key/value
 * 2. Removes `undefined` values
 * 3. Removes empty objects (but not `false` values)
 * Does not operate recursively.
 */
const compactConfig = _.partial(
  _.omitBy,
  _,
  (value: unknown, key: string) =>
    key === 'subcommand' || _.isUndefined(value) || (_.isObject(value) && _.isEmpty(value))
);

/**
 * Calculates the result of the given function and return its value
 * or the default one if there was an exception.
 */
async function getSafeResult<T>(f: () => Promise<T>, defaultValue: T): Promise<T> {
  try {
    return await f();
  } catch {
    return defaultValue;
  }
}

interface DebugInfoInput {
  driverConfig: {installedExtensions: unknown};
  pluginConfig: {installedExtensions: unknown};
  appiumHome: string;
}

interface FlattenedArg {
  value: unknown;
  argSpec: {dest: string};
}
