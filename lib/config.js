import _ from 'lodash';
import path from 'path';
import { mkdirp, fs } from 'appium-support';
import { exec } from 'teen_process';
import logger from './logger';
import pkgObj from '../../package.json'; // eslint-disable-line import/no-unresolved


const APPIUM_VER = pkgObj.version;

function getNodeVersion () {
  // expect v<major>.<minor>.<patch>
  // we will pull out `major` and `minor`
  let version = process.version.match(/^v(\d+)\.(\d+)/);
  return [Number(version[1]), Number(version[2])];
}

async function getGitRev () {
  let cwd = path.resolve(__dirname, "..", "..");
  let rev = null;
  try {
    let {stdout} = await exec("git", ["rev-parse", "HEAD"], {cwd});
    rev = stdout.trim();
  } catch (ign) {}
  return rev;
}

async function getAppiumConfig () {
  let stat = await fs.stat(path.resolve(__dirname, '..'));
  let built = stat.mtime.getTime();
  let config = {
    'git-sha': await getGitRev(),
    built,
    version: APPIUM_VER,
  };
  return config;
}

function checkNodeOk () {
  let [major, minor] = getNodeVersion();
  if (major < 4) {
    let msg = `Node version must be >= 4. Currently ${major}.${minor}`;
    logger.errorAndThrow(msg);
  }
}

function warnNodeDeprecations () {
  let [major] = getNodeVersion();
  if (major < 4) {
    logger.warn("Appium support for versions of node < 4 has been " +
                "deprecated and will be removed in a future version. Please " +
                "upgrade!");
  }
}

async function showConfig () {
  let config = await getAppiumConfig();
  console.log(JSON.stringify(config)); // eslint-disable-line no-console
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
  if (port > 0 && port < 65536) return true;
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

export { getAppiumConfig, validateServerArgs, checkNodeOk, showConfig,
         warnNodeDeprecations, validateTmpDir, getNonDefaultArgs,
         getDeprecatedArgs, getGitRev, checkValidPort, APPIUM_VER };
