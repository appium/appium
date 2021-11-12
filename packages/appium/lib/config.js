import _ from 'lodash';
import { mkdirp, system, fs } from '@appium/support';
import axios from 'axios';
import { exec } from 'teen_process';
import { rootDir } from './utils';
import logger from './logger';
import semver from 'semver';
import findUp from 'find-up';
import { getDefaultsFromSchema } from './schema/schema';

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
  return semver.coerce(process.version);
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
 * @returns {string|void} Path to dir or `undefined` if not found
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

async function showConfig () {
  await updateBuildInfo(true);
  console.log(JSON.stringify(getBuildInfo())); // eslint-disable-line no-console
}

function getNonDefaultServerArgs (parser, args) {
  // hopefully these function names are descriptive enough

  function typesDiffer (dest) {
    return typeof args[dest] !== typeof defaultsFromSchema[dest];
  }

  function defaultValueIsArray (dest) {
    return _.isArray(defaultsFromSchema[dest]);
  }

  function argsValueIsArray (dest) {
    return _.isArray(args[dest]);
  }

  function arraysDiffer (dest) {
    return _.difference(args[dest], defaultsFromSchema[dest]).length > 0;
  }

  function valuesUnequal (dest) {
    return args[dest] !== defaultsFromSchema[dest];
  }

  function defaultIsDefined (dest) {
    return !_.isUndefined(defaultsFromSchema[dest]);
  }

  // note that `_.overEvery` is like an "AND", and `_.overSome` is like an "OR"

  const argValueNotArrayOrArraysDiffer = _.overSome([
    _.negate(argsValueIsArray),
    arraysDiffer
  ]);

  const defaultValueNotArrayAndValuesUnequal = _.overEvery([
    _.negate(defaultValueIsArray), valuesUnequal
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
   * @param {string} dest - argument name (`dest` value)
   * @returns {boolean}
   */
  const isNotDefault = _.overEvery([
    defaultIsDefined,
    _.overSome([
      typesDiffer,
      _.overEvery([
        defaultValueIsArray,
        argValueNotArrayOrArraysDiffer
      ]),
      defaultValueNotArrayAndValuesUnequal
    ])
  ]);

  const defaultsFromSchema = getDefaultsFromSchema();

  return _.pickBy(args, (__, key) => isNotDefault(key));
}

async function validateTmpDir (tmpDir) {
  try {
    await mkdirp(tmpDir);
  } catch (e) {
    throw new Error(`We could not ensure that the temp dir you specified ` +
                    `(${tmpDir}) exists. Please make sure it's writeable.`);
  }
}

export {
  getBuildInfo, checkNodeOk, showConfig,
  warnNodeDeprecations, validateTmpDir, getNonDefaultServerArgs,
  getGitRev, APPIUM_VER, updateBuildInfo
};
