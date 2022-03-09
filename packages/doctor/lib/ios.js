import { ok, nok, okOptional, nokOptional, resolveExecutablePath } from './utils'; // eslint-disable-line
import { fs } from '@appium/support';
import { exec } from 'teen_process';
import { DoctorCheck, FixSkippedError } from './doctor';
import log from './logger';
import { fixIt } from './prompt';
import EnvVarAndPathCheck from './env';
import '@colors/colors';

let checks = [];
let fixes = {};

// Check for Xcode.
class XcodeCheck extends DoctorCheck {
  async diagnose () {
    let xcodePath;
    try {
      // https://github.com/appium/appium/issues/12093#issuecomment-459358120 can happen
      await exec('xcrun', ['simctl', 'help']);
    } catch (err) {
      return nok('Error running xcrun simctl');
    }
    try {
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

// Dev Tools Security
class DevToolsSecurityCheck extends DoctorCheck {
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
}
checks.push(new DevToolsSecurityCheck());

checks.push(new EnvVarAndPathCheck('HOME'));

class OptionalLyftCommandCheck extends DoctorCheck {
  async diagnose () {
    const lyftCmd = await resolveExecutablePath('set-simulator-location');
    if (lyftCmd) {
      return okOptional('set-simulator-location is installed');
    }

    return nokOptional('set-simulator-location is not installed');
  }

  async fix () { // eslint-disable-line require-await
    return `${'set-simulator-location'.bold} is needed to set location for Simulator. ` +
      'Please read https://github.com/lyft/set-simulator-location to install it';
  }
}
checks.push(new OptionalLyftCommandCheck());


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
    return `Why ${'idb'.bold} is needed and how to install it: ${OptionalIdbCommandCheck.idbReadmeURL}`;
  }
}
// link to idb README.md
// https://github.com/appium/appium-ios/blob/main/packages/idb/README.md
OptionalIdbCommandCheck.idbReadmeURL = 'https://git.io/JnxQc';
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

class OptionalIOSDeployCommandCheck extends DoctorCheck {
  async diagnose () {
    const iosDeployPath = await resolveExecutablePath('ios-deploy');
    return iosDeployPath
      ? okOptional(`ios-deploy is installed at: ${iosDeployPath}. Installed version is: ${(await exec(iosDeployPath, ['-V'])).stdout.trim()}`)
      : nokOptional('ios-deploy cannot be found');
  }

  async fix () { // eslint-disable-line require-await
    return `${'ios-deploy'.bold} is used as a fallback command to install iOS applications to real device. Please read https://github.com/ios-control/ios-deploy/ to install it`;
  }
}
checks.push(new OptionalIOSDeployCommandCheck());

export {
  fixes, XcodeCheck, XcodeCmdLineToolsCheck, DevToolsSecurityCheck,
  OptionalIdbCommandCheck, OptionalApplesimutilsCommandCheck,
  OptionalIOSDeployCommandCheck, OptionalLyftCommandCheck
};
export default checks;
