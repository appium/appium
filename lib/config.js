import _ from 'lodash';
import path from 'path';
import { mkdirp, fs, system, util } from 'appium-support';
import request from 'request-promise';
import { exec } from 'teen_process';
import { rootDir } from './utils';
import logger from './logger';

const APPIUM_VER = require(path.resolve(rootDir, 'package.json')).version;
const GIT_META_ROOT = '.git';
const GIT_BINARY = `git${system.isWindows() ? '.exe' : ''}`;
const GITHUB_API = 'https://api.github.com/repos/appium/appium';
const BUILD_INFO = {
  version: APPIUM_VER,
};

function getNodeVersion () {
  // expect v<major>.<minor>.<patch>
  // we will pull out `major` and `minor`
  let version = process.version.match(/^v(\d+)\.(\d+)/);
  return [Number(version[1]), Number(version[2])];
}

async function updateBuildInfo () {
  const sha = await getGitRev(true);
  if (!sha) {
    return;
  }
  BUILD_INFO['git-sha'] = sha;
  const built = await getGitTimestamp(sha, true);
  if (!_.isEmpty(built)) {
    BUILD_INFO.built = built;
  }
}

async function getGitRev (useGitHubFallback = false) {
  if (await fs.exists(path.resolve(rootDir, GIT_META_ROOT))) {
    try {
      const {stdout} = await exec(GIT_BINARY, ['rev-parse', 'HEAD'], {
        cwd: rootDir
      });
      return stdout.trim();
    } catch (err) {
      logger.warn(`Cannot retrieve git revision for Appium version ${APPIUM_VER} from the local repository. ` +
        `Original error: ${err.message}`);
    }
  }

  if (!useGitHubFallback) {
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
  } catch (err) {
    logger.warn(`Cannot retrieve git revision for Appium version ${APPIUM_VER} from GitHub. ` +
      `Original error: ${err.message}`);
  }
  return null;
}

async function getGitTimestamp (commitSha, useGitHubFallback = false) {
  if (await fs.exists(path.resolve(rootDir, GIT_META_ROOT))) {
    try {
      const {stdout} = await exec(GIT_BINARY, ['show', '-s', '--format=%ci', commitSha], {
        cwd: rootDir
      });
      return stdout.trim();
    } catch (err) {
      logger.warn(`Cannot retrieve the timestamp for Appium git commit ${commitSha} from the local repository. ` +
        `Original error: ${err.message}`);
    }
  }

  if (!useGitHubFallback) {
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
  } catch (err) {
    logger.warn(`Cannot retrieve the timestamp for Appium git commit ${commitSha} from GitHub. ` +
      `Original error: ${err.message}`);
  }
  return null;
}

/**
 * @returns Mutable object containing Appium build information. By default it
 * only contains the Appium version, but is updated with the build timestamp
 * and git commit hash asynchronously as soon as `updateBuildInfo` is called
 * and succeeds.
 */
async function getBuildInfo () {
  return BUILD_INFO;
}

function checkNodeOk () {
  let [major, minor] = getNodeVersion();
  if (major < 6) {
    let msg = `Node version must be >= 6. Currently ${major}.${minor}`;
    logger.errorAndThrow(msg);
  }
}

function warnNodeDeprecations () {
  let [major] = getNodeVersion();
  if (major < 8) {
    logger.warn("Appium support for versions of node < 8 has been " +
                "deprecated and will be removed in a future version. Please " +
                "upgrade!");
  }
}

async function showConfig () {
  await updateBuildInfo();
  console.log(JSON.stringify(await getBuildInfo())); // eslint-disable-line no-console
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
    selendroidPort: checkValidPort,
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

export { getBuildInfo, validateServerArgs, checkNodeOk, showConfig,
         warnNodeDeprecations, validateTmpDir, getNonDefaultArgs,
         getDeprecatedArgs, getGitRev, checkValidPort, APPIUM_VER,
         updateBuildInfo };
