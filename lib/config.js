import _ from 'lodash';
import path from 'path';
import _mkdirp from 'mkdirp';
import B from 'bluebird';
import { exec } from 'teen_process';
import logger from './logger';
import pkgObj from '../../package.json';

const mkdirp = B.promisify(_mkdirp);
const NODE_VER = Number(process.version.match(/^v(\d+\.\d+)/)[1]);
const APPIUM_VER = pkgObj.version;

async function getGitRev () {
  let cwd = path.resolve(__dirname, "..", "..");
  let rev = null;
  try {
    let {stdout} = await exec("git", ["rev-parse", "HEAD"], {cwd});
    rev = stdout.trim();
  } catch (e) {}
  return rev;
}

async function getAppiumConfig () {
  let config = {
    'git-sha': await getGitRev(),
    'built': Date.now() // TODO built should be got from mtime of build/
  };
  return config;
}

function checkNodeOk () {
  if (NODE_VER < 0.10) {
    logger.error("Appium requires Node >= 0.10");
    process.exit(1);
  }
}

function warnNodeDeprecations () {
  if (NODE_VER < 0.12) {
    logger.warn("Appium support for versions of node < 0.12 has been " +
                "deprecated and will be removed in a future version. Please " +
                "upgrade!");
  }
}

async function showConfigAndExit () {
  let config;
  try {
    config = await getAppiumConfig();
    console.log(JSON.stringify(config));
  } catch (e) {
    process.exit(1);
  }
  process.exit(0);
}

function getNonDefaultArgs (parser, args) {
  let nonDefaults = {};
  for (let rawArg of parser.rawArgs) {
    let arg = rawArg[1].dest;
    if (args[arg] !== rawArg[1].defaultValue) {
      nonDefaults[arg] = args[arg];
    }
  }
  return nonDefaults;
}

function getDeprecatedArgs (parser, args) {
  let deprecated = {};
  for (let rawArg of parser.rawArgs) {
    let arg = rawArg[1].dest;
    if (args[arg] && rawArg[1].deprecatedFor) {
      deprecated[rawArg[0]] = `use instead: ${rawArg[1].deprecatedFor}`;
    }
  }
  return deprecated;
}

function checkValidPort (port) {
  if (port > 0 && port < 65536) return true;
  console.error("Port must be greater than 0 and less than 65536");
  return false;
}

function validateServerArgs (parser, args) {
  let exclusives = [
    ['noReset', 'fullReset']
    , ['ipa', 'safari']
    , ['app', 'safari']
    , ['forceIphone', 'forceIpad']
    , ['deviceName', 'defaultDevice']
  ];

  for (let exSet of exclusives) {
    let numFoundInArgs = 0;
    for (let opt of exSet) {
      if (_.has(args, opt) && args[opt]) {
        numFoundInArgs++;
      }
    }
    if (numFoundInArgs > 1) {
      console.error((`You can't pass in more than one argument from the ` +
                     `set ${JSON.stringify(exSet)}, since they are ` +
                     `mutually exclusive`).red);
      process.exit(1);
    }
  }

  const validations = {
    port: checkValidPort
  , callbackPort: checkValidPort
  , bootstrapPort: checkValidPort
  , selendroidPort: checkValidPort
  , chromedriverPort: checkValidPort
  , robotPort: checkValidPort
  , backendRetries: (r) => { return r >= 0; }
  };

  const nonDefaultArgs = getNonDefaultArgs(parser, args);

  for (let [arg, validator] of _.pairs(validations)) {
    if (_.has(nonDefaultArgs, arg)) {
      if (!validator(args[arg])) {
        console.error(`Invalid argument for param ${arg}: ${args[arg]}`);
        process.exit(1);
      }
    }
  }
}

async function validateTmpDir (tmpDir) {
  try {
    await mkdirp(tmpDir);
  } catch (e) {
    console.error(`We could not ensure that the temp dir you specified (` +
                  `${tmpDir}) exists. Please make sure it's writeable.`);
    process.exit(1);
  }
}

export { getAppiumConfig, validateServerArgs, checkNodeOk, showConfigAndExit,
         warnNodeDeprecations, validateTmpDir, getNonDefaultArgs,
         getDeprecatedArgs, getGitRev, APPIUM_VER };
