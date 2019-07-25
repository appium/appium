import _ from 'lodash';
import path from 'path';
import { mkdirp, fs, system, util } from 'appium-support';
import request from 'request-promise';
import { exec } from 'teen_process';
import { rootDir } from './utils';
import logger from './logger';
import semver from 'semver';


const npmPackage = require(path.resolve(rootDir, 'package.json'));
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

async function getGitRev (useGithubApiFallback = false) {
  if (await fs.exists(path.resolve(rootDir, GIT_META_ROOT))) {
    try {
      const {stdout} = await exec(GIT_BINARY, ['rev-parse', 'HEAD'], {
        cwd: rootDir
      });
      return stdout.trim();
    } catch (ign) {}
  }

  if (!useGithubApiFallback) {
    return null;
  }

  try {
    const response = await request.get(`${GITHUB_API}/tags`, {
      headers: {
        'User-Agent': `Appium ${APPIUM_VER}`
      }
    });
    const resBodyObj = util.safeJsonParse(response);
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
  if (await fs.exists(path.resolve(rootDir, GIT_META_ROOT))) {
    try {
      const {stdout} = await exec(GIT_BINARY, ['show', '-s', '--format=%ci', commitSha], {
        cwd: rootDir
      });
      return stdout.trim();
    } catch (ign) {}
  }

  if (!useGithubApiFallback) {
    return null;
  }

  try {
    const response = await request.get(`${GITHUB_API}/commits/${commitSha}`, {
      headers: {
        'User-Agent': `Appium ${APPIUM_VER}`
      }
    });
    const resBodyObj = util.safeJsonParse(response);
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
 * @returns Mutable object containing Appium build information. By default it
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

function getNonDefaultArgs (parser, args) {
  let nonDefaults = {};
  for (let rawArg of parser.rawArgs) {
    let arg = rawArg[1].dest;
    if (args[arg] && args[arg] !== rawArg[1].defaultValue) {
      nonDefaults[arg] = args[arg];
    }
  }
  return nonDefaults;
}

function getDeprecatedArgs (parser, args) {
  // go through the server command line arguments and figure
  // out which of the ones used are deprecated
  let deprecated = {};
  for (let rawArg of parser.rawArgs) {
    let arg = rawArg[1].dest;
    let defaultValue = rawArg[1].defaultValue;
    let isDeprecated = !!rawArg[1].deprecatedFor;
    if (args[arg] && args[arg] !== defaultValue && isDeprecated) {
      deprecated[rawArg[0]] = rawArg[1].deprecatedFor;
    }
  }
  return deprecated;
}

function checkValidPort (port, portName) {
  if (port > 0 && port < 65536) return true; // eslint-disable-line curly
  logger.error(`Port '${portName}' must be greater than 0 and less than 65536. Currently ${port}`);
  return false;
}

function validateServerArgs (parser, args) {
  // arguments that cannot both be set
  let exclusives = [
    ['noReset', 'fullReset'],
    ['ipa', 'safari'],
    ['app', 'safari'],
    ['forceIphone', 'forceIpad'],
    ['deviceName', 'defaultDevice']
  ];

  for (let exSet of exclusives) {
    let numFoundInArgs = 0;
    for (let opt of exSet) {
      if (_.has(args, opt) && args[opt]) {
        numFoundInArgs++;
      }
    }
    if (numFoundInArgs > 1) {
      throw new Error(`You can't pass in more than one argument from the ` +
                      `set ${JSON.stringify(exSet)}, since they are ` +
                      `mutually exclusive`);
    }
  }

  const validations = {
    port: checkValidPort,
    callbackPort: checkValidPort,
    bootstrapPort: checkValidPort,
    chromedriverPort: checkValidPort,
    robotPort: checkValidPort,
    backendRetries: (r) => { return r >= 0; }
  };

  const nonDefaultArgs = getNonDefaultArgs(parser, args);

  for (let [arg, validator] of _.toPairs(validations)) {
    if (_.has(nonDefaultArgs, arg)) {
      if (!validator(args[arg], arg)) {
        throw new Error(`Invalid argument for param ${arg}: ${args[arg]}`);
      }
    }
  }
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
  getBuildInfo, validateServerArgs, checkNodeOk, showConfig,
  warnNodeDeprecations, validateTmpDir, getNonDefaultArgs, getDeprecatedArgs,
  getGitRev, checkValidPort, APPIUM_VER, updateBuildInfo,
};
