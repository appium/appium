// @ts-check

/* eslint-disable no-console */
import _ from 'lodash';
import { mkdirp, system, fs } from '@appium/support';
import axios from 'axios';
import { exec } from 'teen_process';
import { rootDir } from './utils';
import logger from './logger';
import semver from 'semver';
import findUp from 'find-up';
import { getDefaultsForSchema, getAllArgSpecs } from './schema/schema';

const npmPackage = fs.readPackageJsonFrom(__dirname);

const APPIUM_VER = npmPackage.version;
const MIN_NODE_VERSION = npmPackage.engines.node;

const GIT_META_ROOT = '.git';
const GIT_BINARY = `git${system.isWindows() ? '.exe' : ''}`;
const GITHUB_API = 'https://api.github.com/repos/appium/appium';

const BUILD_INFO = {
  version: APPIUM_VER,
};

function getNodeVersion () {
  return /** @type {import('semver').SemVer} */(semver.coerce(process.version));
}

async function updateBuildInfo (useGithubApiFallback = false) {
  const sha = await getGitRev(useGithubApiFallback);
  if (!sha) {
    return;
  }
  BUILD_INFO['git-sha'] = sha;
  const built = await getGitTimestamp(sha, useGithubApiFallback);
  if (!_.isEmpty(built)) {
    BUILD_INFO.built = built;
  }
}

/**
 * Finds the Git metadata dir (see `GIT_META_ROOT`)
 *
 * This is needed because Appium cannot assume `package.json` and `.git` are in the same
 * directory.  Monorepos, see?
 * @returns {Promise<string|undefined>} Path to dir or `undefined` if not found
 */
async function findGitRoot () {
  return await findUp(GIT_META_ROOT, {cwd: rootDir, type: 'directory'});
}

async function getGitRev (useGithubApiFallback = false) {
  const gitRoot = await findGitRoot();
  if (gitRoot) {
    try {
      const {stdout} = await exec(GIT_BINARY, ['rev-parse', 'HEAD'], {
        cwd: gitRoot
      });
      return stdout.trim();
    } catch (ign) {}
  }

  if (!useGithubApiFallback) {
    return null;
  }

  try {
    const resBodyObj = (await axios.get(`${GITHUB_API}/tags`, {
      headers: {
        'User-Agent': `Appium ${APPIUM_VER}`
      }
    })).data;
    if (_.isArray(resBodyObj)) {
      for (const {name, commit} of resBodyObj) {
        if (name === `v${APPIUM_VER}` && commit && commit.sha) {
          return commit.sha;
        }
      }
    }
  } catch (ign) {}
  return null;
}

/**
 * @param {string} commitSha
 * @param {boolean} [useGithubApiFallback]
 * @returns {Promise<number?>}
 */
async function getGitTimestamp (commitSha, useGithubApiFallback = false) {
  const gitRoot = await findGitRoot();
  if (gitRoot) {
    try {
      const {stdout} = await exec(GIT_BINARY, ['show', '-s', '--format=%ci', commitSha], {
        cwd: gitRoot
      });
      return stdout.trim();
    } catch (ign) {}
  }

  if (!useGithubApiFallback) {
    return null;
  }

  try {
    const resBodyObj = (await axios.get(`${GITHUB_API}/commits/${commitSha}`, {
      headers: {
        'User-Agent': `Appium ${APPIUM_VER}`
      }
    })).data;
    if (resBodyObj && resBodyObj.commit) {
      if (resBodyObj.commit.committer && resBodyObj.commit.committer.date) {
        return resBodyObj.commit.committer.date;
      }
      if (resBodyObj.commit.author && resBodyObj.commit.author.date) {
        return resBodyObj.commit.author.date;
      }
    }
  } catch (ign) {}
  return null;
}

/**
 * @return Mutable object containing Appium build information. By default it
 * only contains the Appium version, but is updated with the build timestamp
 * and git commit hash asynchronously as soon as `updateBuildInfo` is called
 * and succeeds.
 */
function getBuildInfo () {
  return BUILD_INFO;
}

function checkNodeOk () {
  const version = getNodeVersion();
  if (!semver.satisfies(version, MIN_NODE_VERSION)) {
    logger.errorAndThrow(`Node version must be ${MIN_NODE_VERSION}. Currently ${version.version}`);
  }
}

function warnNodeDeprecations () {
  /**
   * Uncomment this section to get node version deprecation warnings
   * Also add test cases to config-specs.js to cover the cases added
   **/

  // const version = getNodeVersion();
  // if (version.major < 8) {
  //   logger.warn(`Appium support for versions of node < ${version.major} has been ` +
  //               'deprecated and will be removed in a future version. Please ' +
  //               'upgrade!');
  // }
}

async function showBuildInfo () {
  await updateBuildInfo(true);
  console.log(JSON.stringify(getBuildInfo())); // eslint-disable-line no-console
}

/**
 * Returns k/v pairs of server arguments which are _not_ the defaults.
 * @param {ParsedArgs} parsedArgs
 * @returns {Partial<ParsedArgs>}
 */
function getNonDefaultServerArgs (parsedArgs) {
  /**
   * Flattens parsed args into a single level object for comparison with
   * flattened defaults across server args and extension args.
   * @param {ParsedArgs} args
   * @returns {Record<string, { value: any, argSpec: import('./schema/arg-spec').ArgSpec }>}
   */
  const flatten = (args) => {
    const argSpecs = getAllArgSpecs();
    const flattened = _.reduce([...argSpecs.values()], (acc, argSpec) => {
      if (_.has(args, argSpec.dest)) {
        acc[argSpec.dest] = {value: _.get(args, argSpec.dest), argSpec};
      }
      return acc;
    }, /** @type {Record<string, { value: any, argSpec: import('./schema/arg-spec').ArgSpec }>} */({}));

    return flattened;
  };

  const args = flatten(parsedArgs);

  // hopefully these function names are descriptive enough
  const typesDiffer = /** @param {string} dest */(dest) => typeof args[dest].value !== typeof defaultsFromSchema[dest];

  const defaultValueIsArray = /** @param {string} dest */(dest) => _.isArray(defaultsFromSchema[dest]);

  const argsValueIsArray = /** @param {string} dest */(dest) => _.isArray(args[dest].value);

  const arraysDiffer = /** @param {string} dest */(dest) => _.gt(_.size(_.difference(args[dest].value, defaultsFromSchema[dest])), 0);

  const valuesDiffer = /** @param {string} dest */(dest) => args[dest].value !== defaultsFromSchema[dest];

  const defaultIsDefined = /** @param {string} dest */(dest) => !_.isUndefined(defaultsFromSchema[dest]);

  // note that `_.overEvery` is like an "AND", and `_.overSome` is like an "OR"

  const argValueNotArrayOrArraysDiffer = _.overSome([
    _.negate(argsValueIsArray),
    arraysDiffer
  ]);

  const defaultValueNotArrayAndValuesDiffer = _.overEvery([
    _.negate(defaultValueIsArray), valuesDiffer
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
      _.overEvery([
        defaultValueIsArray,
        argValueNotArrayOrArraysDiffer
      ]),
      defaultValueNotArrayAndValuesDiffer
    ])
  ]);

  const defaultsFromSchema = getDefaultsForSchema(true);

  return _.reduce(
    _.pickBy(args, (__, key) => isNotDefault(key)),
    // explodes the flattened object back into nested one
    (acc, {value, argSpec}) => _.set(acc, argSpec.dest, value), /** @type {Partial<ParsedArgs>} */({})
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
  (value, key) => key === 'subcommand' || _.isUndefined(value) || (_.isObject(value) && _.isEmpty(value))
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
function showConfig (nonDefaultPreConfigParsedArgs, configResult, defaults, parsedArgs) {
  console.log('Appium Configuration\n');
  console.log('from defaults:\n');
  console.dir(compactConfig(defaults));
  if (configResult.config) {
    console.log(`\nfrom config file at ${configResult.filepath}:\n`);
    console.dir(compactConfig(configResult.config));
  } else {
    console.log(`\n(no configuration file loaded)`);
  }
  if (_.isEmpty(nonDefaultPreConfigParsedArgs)) {
    console.log(`\n(no CLI parameters provided)`);
  } else {
    console.log('\nvia CLI or function call:\n');
    console.dir(compactConfig(nonDefaultPreConfigParsedArgs));
  }
  console.log('\nfinal configuration:\n');
  console.dir(compactConfig(parsedArgs));
}

/**
 * @param {string} tmpDir
 */
async function validateTmpDir (tmpDir) {
  try {
    await mkdirp(tmpDir);
  } catch (e) {
    throw new Error(`We could not ensure that the temp dir you specified ` +
                    `(${tmpDir}) exists. Please make sure it's writeable.`);
  }
}

export {
  getBuildInfo, checkNodeOk, showBuildInfo,
  warnNodeDeprecations, validateTmpDir, getNonDefaultServerArgs,
  getGitRev, APPIUM_VER, updateBuildInfo, showConfig
};

/**
 * @typedef {import('../types/types').ParsedArgs} ParsedArgs
 */
