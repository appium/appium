/* eslint-disable no-console */
import _ from 'lodash';
import {system, fs, npm} from '@appium/support';
import axios from 'axios';
import {exec} from 'teen_process';
import semver from 'semver';
import os from 'node:os';
import {npmPackage} from './utils';
import B from 'bluebird';
import {getDefaultsForSchema, getAllArgSpecs} from './schema/schema';

export const APPIUM_VER = npmPackage.version;
const ENGINES = /** @type {Record<string,string>} */ (npmPackage.engines);
const MIN_NODE_VERSION = ENGINES.node;
export const rootDir = fs.findRoot(__dirname);

const GIT_BINARY = `git${system.isWindows() ? '.exe' : ''}`;
const GITHUB_API = 'https://api.github.com/repos/appium/appium';

/**
 * @type {import('appium/types').BuildInfo}
 */
const BUILD_INFO = {
  version: APPIUM_VER,
};

function getNodeVersion() {
  return /** @type {import('semver').SemVer} */ (semver.coerce(process.version));
}

/**
 * @param {boolean} [useGithubApiFallback]
 * @returns {Promise<void>}
 */
export async function updateBuildInfo(useGithubApiFallback = false) {
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

/** @type {() => Promise<string?>} */
const getFullGitPath = _.memoize(async function getFullGitPath() {
  try {
    return await fs.which(GIT_BINARY);
  } catch {
    return null;
  }
});

/**
 * Prints server debug into into the console.
 *
 * @param {{
 * driverConfig: import('./extension/driver-config').DriverConfig,
 * pluginConfig: import('./extension/plugin-config').PluginConfig,
 * appiumHome: string
 * }} info
 * @returns {Promise<void>}
 */
export async function showDebugInfo({driverConfig, pluginConfig, appiumHome}) {
  const getNpmVersion = async () => {
    const {stdout} = await npm.exec('--version', [], {cwd: process.cwd()});
    return _.trim(stdout);
  };
  const findNpmLocation = async () => await fs.which(system.isWindows() ? 'npm.cmd' : 'npm');
  const [npmVersion, npmLocation] = await B.all([
    ...([getNpmVersion, findNpmLocation].map((f) => getSafeResult(f, 'unknown'))),
    /** @type {any} */ (updateBuildInfo()),
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
 * @param {boolean} [useGithubApiFallback]
 * @returns {Promise<string?>}
 */
export async function getGitRev(useGithubApiFallback = false) {
  const fullGitPath = await getFullGitPath();
  if (fullGitPath) {
    try {
      const {stdout} = await exec(fullGitPath, ['rev-parse', 'HEAD'], {
        cwd: __dirname,
      });
      return stdout.trim();
    } catch (ign) {}
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
  } catch (ign) {}
  return null;
}

/**
 * @param {string} commitSha
 * @param {boolean} [useGithubApiFallback]
 * @returns {Promise<string?>}
 */
async function getGitTimestamp(commitSha, useGithubApiFallback = false) {
  const fullGitPath = await getFullGitPath();
  if (fullGitPath) {
    try {
      const {stdout} = await exec(fullGitPath, ['show', '-s', '--format=%ci', commitSha], {
        cwd: __dirname,
      });
      return stdout.trim();
    } catch (ign) {}
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
  } catch (ign) {}
  return null;
}

/**
 * Mutable object containing Appium build information. By default it
 * only contains the Appium version, but is updated with the build timestamp
 * and git commit hash asynchronously as soon as `updateBuildInfo` is called
 * and succeeds.
 * @returns {import('appium/types').BuildInfo}
 */
export function getBuildInfo() {
  return BUILD_INFO;
}

/**
 * @returns {void}
 * @throws {Error} If Node version is outside of the supported range
 */
export function checkNodeOk() {
  const version = getNodeVersion();
  if (!semver.satisfies(version, MIN_NODE_VERSION)) {
    throw new Error(
      `Node version must be at least ${MIN_NODE_VERSION}; current is ${version.version}`
    );
  }
}

export async function showBuildInfo() {
  await updateBuildInfo(true);
  console.log(JSON.stringify(getBuildInfo())); // eslint-disable-line no-console
}

/**
 * Returns k/v pairs of server arguments which are _not_ the defaults.
 * @param {Args} parsedArgs
 * @returns {Args}
 */
export function getNonDefaultServerArgs(parsedArgs) {
  /**
   * Flattens parsed args into a single level object for comparison with
   * flattened defaults across server args and extension args.
   * @param {Args} args
   * @returns {Record<string, { value: any, argSpec: ArgSpec }>}
   */
  const flatten = (args) => {
    const argSpecs = getAllArgSpecs();
    const flattened = _.reduce(
      [...argSpecs.values()],
      (acc, argSpec) => {
        if (_.has(args, argSpec.dest)) {
          acc[argSpec.dest] = {value: _.get(args, argSpec.dest), argSpec};
        }
        return acc;
      },
      /** @type {Record<string, { value: any, argSpec: ArgSpec }>} */ ({})
    );

    return flattened;
  };

  const args = flatten(parsedArgs);

  // hopefully these function names are descriptive enough
  const typesDiffer = /** @param {string} dest */ (dest) =>
    typeof args[dest].value !== typeof defaultsFromSchema[dest];

  const defaultValueIsArray = /** @param {string} dest */ (dest) =>
    _.isArray(defaultsFromSchema[dest]);

  const argsValueIsArray = /** @param {string} dest */ (dest) => _.isArray(args[dest].value);

  const arraysDiffer = /** @param {string} dest */ (dest) =>
    _.gt(_.size(_.difference(args[dest].value, defaultsFromSchema[dest])), 0);

  const valuesDiffer = /** @param {string} dest */ (dest) =>
    args[dest].value !== defaultsFromSchema[dest];

  const defaultIsDefined = /** @param {string} dest */ (dest) =>
    !_.isUndefined(defaultsFromSchema[dest]);

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
   * @type {(dest: string) => boolean}
   */
  const isNotDefault = _.overEvery([
    defaultIsDefined,
    _.overSome([
      typesDiffer,
      _.overEvery([defaultValueIsArray, argValueNotArrayOrArraysDiffer]),
      defaultValueNotArrayAndValuesDiffer,
    ]),
  ]);

  const defaultsFromSchema = getDefaultsForSchema(true);

  return _.reduce(
    _.pickBy(args, (__, key) => isNotDefault(key)),
    // explodes the flattened object back into nested one
    (acc, {value, argSpec}) => _.set(acc, argSpec.dest, value),
    /** @type {Args} */ ({})
  );
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
  (value, key) =>
    key === 'subcommand' || _.isUndefined(value) || (_.isObject(value) && _.isEmpty(value))
);

/**
 * Shows a breakdown of the current config after CLI params, config file loaded & defaults applied.
 *
 * The actual shape of `preConfigParsedArgs` and `defaults` does not matter for the purposes of this function,
 * but it's intended to be called with values of type {@link ParsedArgs} and `DefaultValues<true>`, respectively.
 *
 * @param {Partial<ParsedArgs>} nonDefaultPreConfigParsedArgs - Parsed CLI args (or param to `init()`) before config & defaults applied
 * @param {import('./config-file').ReadConfigFileResult} configResult - Result of attempting to load a config file.  _Must_ be normalized
 * @param {Partial<ParsedArgs>} defaults - Configuration defaults from schemas
 * @param {ParsedArgs} parsedArgs - Entire parsed args object
 */
export function showConfig(nonDefaultPreConfigParsedArgs, configResult, defaults, parsedArgs) {
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
 * @param {string} root
 * @param {boolean} [requireWriteable=true]
 * @param {string} [displayName='folder path']
 * @throws {Error}
 */
export async function requireDir(root, requireWriteable = true, displayName = 'folder path') {
  let stat;
  try {
    stat = await fs.stat(root);
  } catch (e) {
    if (e.code === 'ENOENT') {
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
    } catch (e) {
      throw new Error(
        `The ${displayName} '${root}' must be ` +
        `writeable for the current user account '${os.userInfo().username}'`
      );
    }
  }
}

/**
 * Calculates the result of the given function and return its value
 * or the default one if there was an exception.
 *
 * @template T
 * @param {() => Promise<T>} f
 * @param {T} defaultValue
 * @returns {Promise<T>}
 */
async function getSafeResult(f, defaultValue) {
  try {
    return await f();
  } catch {
    return defaultValue;
  }
}

/**
 * @typedef {import('appium/types').ParsedArgs} ParsedArgs
 * @typedef {import('appium/types').Args} Args
 * @typedef {import('./schema/arg-spec').ArgSpec} ArgSpec
 */
