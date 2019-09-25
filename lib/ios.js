import { ok, nok, okOptional, nokOptional, authorizeIos, resolveExecutablePath } from './utils'; // eslint-disable-line
import { fs, util } from 'appium-support';
import { exec } from 'teen_process';
import { DoctorCheck, FixSkippedError } from './doctor';
import log from './logger';
import CarthageDetector from './carthage-detector';
import { fixIt } from './prompt';
import EnvVarAndPathCheck from './env';
import _ from 'lodash';
import 'colors';

let checks = [];
let fixes = {};

// Check for Xcode.
class XcodeCheck extends DoctorCheck {
  async diagnose () {
    let xcodePath;
    try {
      // https://github.com/appium/appium/issues/12093#issuecomment-459358120 can happen
      await exec('xcrun', ['simctl', 'help']);

      const {stdout} = await exec('xcode-select', ['-p']);
      xcodePath = (stdout || '').replace('\n', '');
    } catch (err) {
      return nok('Xcode is NOT installed!');
    }
    return xcodePath && await fs.exists(xcodePath) ? ok(`Xcode is installed at: ${xcodePath}`) :
      nok(`Xcode cannot be found at '${xcodePath}'!`);
  }

  async fix () { // eslint-disable-line require-await
    return `Manually install ${'Xcode'.bold}, and make sure 'xcode-select -p' command shows proper path like '/Applications/Xcode.app/Contents/Developer'`;
  }
}
checks.push(new XcodeCheck());

// Check for Xcode Command Line Tools.
class XcodeCmdLineToolsCheck extends DoctorCheck {
  constructor () {
    super({autofix: true});
  }

  async diagnose () {
    const errMess = 'Xcode Command Line Tools are NOT installed!';
    try {
      // https://stackoverflow.com/questions/15371925/how-to-check-if-command-line-tools-is-installed
      const stdout = (await exec('xcode-select', ['-p'])).stdout;
      return ok(`Xcode Command Line Tools are installed in: ${stdout.trim()}`);
    } catch (err) {
      log.debug(err);
      return nok(errMess);
    }
  }

  async fix () {
    log.info(`The following command need be executed: xcode-select --install`);
    let yesno = await fixIt();
    if (yesno === 'yes') {
      await exec('xcode-select', ['--install']);
    } else {
      log.info(`Skipping you will need to install ${'Xcode'.bold} manually.`);
      throw new FixSkippedError();
    }
  }
}

checks.push(new XcodeCmdLineToolsCheck());

// Automatically run authorize iOS if requested
fixes.authorizeIosFix = async function () {
  log.info(`The authorize iOS script need to be run.`);
  let yesno = await fixIt();
  if (yesno === 'yes') {
    await authorizeIos();
  } else {
    log.info(`Skipping you will need to run ${'the authorize iOS'.bold} manually.`);
    throw new FixSkippedError();
  }
};

// Dev Tools Security
class DevToolsSecurityCheck extends DoctorCheck {
  constructor () {
    super({autofix: true});
  }

  async diagnose () {
    const errMess = 'DevToolsSecurity is NOT enabled!';
    let stdout;
    try {
      stdout = (await exec('DevToolsSecurity', [])).stdout;
    } catch (err) {
      log.debug(err);
      return nok(errMess);
    }
    return stdout && stdout.match(/enabled/) ? ok('DevToolsSecurity is enabled.')
      : nok(errMess);
  }
  async fix () {
    return await fixes.authorizeIosFix();
  }
}
checks.push(new DevToolsSecurityCheck());

// Authorization DB
class AuthorizationDbCheck extends DoctorCheck {
  constructor () {
    super({autofix: true});
  }

  async diagnose () {
    const successMess = 'The Authorization DB is set up properly.';
    const errMess = 'The Authorization DB is NOT set up properly.';
    let stdout;
    try {
      ({stdout} = await exec('security', ['authorizationdb', 'read', 'system.privilege.taskport']));
    } catch (err) {
      log.warn(err);
      return nok(errMess);
    }
    return stdout && (stdout.match(/is-developer/) || stdout.match(/allow/)) ?
      ok(successMess) : nok(errMess);
  }
  async fix () {
    return await fixes.authorizeIosFix();
  }
}
checks.push(new AuthorizationDbCheck());

// Check for Carthage (for WDA)
class CarthageCheck extends DoctorCheck {
  async diagnose () {
    let carthagePath = await CarthageDetector.detect();

    let version;
    if (carthagePath) {
      try {
        const {stdout} = await exec(carthagePath, ['version']);
        // 'Please update to the latest Carthage version: 0.33.0. You currently are on 0.32.0\n0.32.0\n' or '0.32.0\n'
        // 0.32.0 is the current version. 0.33.0 is an available newer version.
        version = _.last(stdout.match(/(\d+\.\d+\.\d+)/g));
        if (!util.coerceVersion(version, false)) {
          log.warn(`Cannot parse Carthage version from ${stdout}`);
        }
      } catch (err) {
        log.warn(err);
      }
    }

    return carthagePath
      ? ok(`Carthage was found at: ${carthagePath}${ version ? `. Installed version is: ${version}` : ''}`)
      : nok(`Carthage was NOT found!`);
  }

  async fix () { // eslint-disable-line require-await
    return `Please install ${'Carthage'.bold}. Visit https://github.com/Carthage` +
           '/Carthage#installing-carthage for more information.';
  }
}
checks.push(new CarthageCheck());

checks.push(new EnvVarAndPathCheck('HOME'));

class OptionalIdbCommandCheck extends DoctorCheck {
  async diagnose () {
    const fbIdbPath = await resolveExecutablePath('idb');
    const fbCompanionIdbPath = await resolveExecutablePath('idb_companion');
    if (fbIdbPath && fbCompanionIdbPath) {
      return okOptional('idb and idb_companion are installed');
    }

    if (!fbIdbPath && fbCompanionIdbPath) {
      return nokOptional('idb is not installed');
    } else if (fbIdbPath && !fbCompanionIdbPath) {
      return nokOptional('idb_companion is not installed');
    }
    return nokOptional('idb and idb_companion are not installed');
  }

  async fix () { // eslint-disable-line require-await
    return `Why ${'idb'.bold} is needed and how to install it: https://github.com/appium/appium-idb`;
  }
}
checks.push(new OptionalIdbCommandCheck());

class OptionalApplesimutilsCommandCheck extends DoctorCheck {
  async diagnose () {
    const applesimutilsPath = await resolveExecutablePath('applesimutils');
    return applesimutilsPath
      ? okOptional(`applesimutils is installed at: ${applesimutilsPath}. Installed versions are: ${(await exec('brew', ['list', '--versions', 'applesimutils'])).stdout.trim()}`)
      : nokOptional('applesimutils cannot be found');
  }

  async fix () { // eslint-disable-line require-await
    return `Why ${'applesimutils'.bold} is needed and how to install it: http://appium.io/docs/en/drivers/ios-xcuitest/`;
  }
}
checks.push(new OptionalApplesimutilsCommandCheck());

export {
  fixes, XcodeCheck, XcodeCmdLineToolsCheck, DevToolsSecurityCheck,
  AuthorizationDbCheck, CarthageCheck, OptionalIdbCommandCheck, OptionalApplesimutilsCommandCheck
};
export default checks;
