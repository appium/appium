import { ok, nok, authorizeIos } from './utils'; // eslint-disable-line
import { fs, system } from 'appium-support';
import { exec } from 'teen_process';
import { DoctorCheck, FixSkippedError } from './doctor';
import log from './logger';
import CarthageDetector from './carthage-detector';
import { fixIt } from './prompt';
import EnvVarAndPathCheck from './env';


let checks = [];
let fixes = {};

// Check for Xcode.
class XcodeCheck extends DoctorCheck {
  async diagnose () {
    let xcodePath;
    try {
      let {stdout} = await exec('xcode-select', ['--print-path']);
      xcodePath = (stdout || '').replace("\n", "");
    } catch (err) {
      return nok('Xcode is NOT installed!');
    }
    return xcodePath && await fs.exists(xcodePath) ? ok(`Xcode is installed at: ${xcodePath}`) :
      nok(`Xcode cannot be found at '${xcodePath}'!`);
  }

  async fix () { // eslint-disable-line require-await
    return 'Manually install Xcode.';
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
    let pkgName = await system.macOsxVersion() === '10.8' ? 'com.apple.pkg.DeveloperToolsCLI' : 'com.apple.pkg.CLTools_Executables';
    let stdout;
    try {
      stdout = (await exec('pkgutil', [`--pkg-info=${pkgName}`])).stdout;
    } catch (err) {
      log.debug(err);
      return nok(errMess);
    }
    return stdout.match(/install-time/) ? ok('Xcode Command Line Tools are installed.') :
      nok(errMess);
  }

  async fix () {
    log.info(`The following command need be executed: xcode-select --install`);
    let yesno = await fixIt();
    if (yesno === 'yes') {
      await exec('xcode-select', ['--install']);
    } else {
      log.info('Skipping you will need to install Xcode manually.');
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
    log.info('Skipping you will need to run the authorize iOS manually.');
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
      stdout = (await exec('security', ['authorizationdb', 'read', 'system.privilege.taskport'])).stdout;
    } catch (err) {
      if (await system.macOsxVersion() === '10.8') {
        let data;
        try {
          data = await fs.readFile('/etc/authorization', 'utf8');
        } catch (err) {
          log.debug(err);
          return nok(errMess);
        }
        let rg = /<key>system.privilege.taskport<\/key>\s*\n\s*<dict>\n\s*<key>allow-root<\/key>\n\s*(<true\/>)/;
        return data && data.match(rg) ? ok(successMess) : nok(errMess);
      } else {
        log.debug(err);
        return nok(errMess);
      }
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
    return carthagePath
      ? ok(`Carthage was found at: ${carthagePath}`)
      : nok(`Carthage was NOT found!`);
  }

  async fix () { // eslint-disable-line require-await
    return 'Please install Carthage. Visit https://github.com/Carthage' +
           '/Carthage#installing-carthage for more information.';
  }
}
checks.push(new CarthageCheck());

checks.push(new EnvVarAndPathCheck('HOME'));

export {
  fixes, XcodeCheck, XcodeCmdLineToolsCheck, DevToolsSecurityCheck,
  AuthorizationDbCheck, CarthageCheck,
};
export default checks;
