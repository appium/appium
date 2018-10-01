import { DoctorCheck } from './doctor';
import { ok, nok } from './utils';
import { fs, system } from 'appium-support';
import path from 'path';
import EnvVarAndPathCheck from './env';


let checks = [];

let javaHome = system.isWindows() ? '%JAVA_HOME%' : '$JAVA_HOME';

checks.push(new EnvVarAndPathCheck('ANDROID_HOME'));
checks.push(new EnvVarAndPathCheck('JAVA_HOME'));

// Check that the PATH includes the jdk's bin directory
class JavaOnPathCheck extends DoctorCheck {
  async diagnose () { // eslint-disable-line require-await
    if (process.env.JAVA_HOME) {
      let javaHomeBin = path.resolve(process.env.JAVA_HOME, 'bin');
      if (process.env.PATH.indexOf(javaHomeBin) + 1) {
        return ok(`Bin directory of ${javaHome} is set`);
      }
    }
    return nok(`Bin directory for ${javaHome} is not set`);
  }

  fix () {
    return `Add '${javaHome}${path.sep}bin' to your PATH environment`;
  }
}

// Check tools
class AndroidToolCheck extends DoctorCheck {
  constructor (toolName, toolPath) {
    super();
    this.toolName = toolName;
    this.toolPath = toolPath;
  }

  async diagnose () {
    if (typeof process.env.ANDROID_HOME === 'undefined') {
      return nok(`${this.toolName} could not be found because ANDROID_HOME is NOT set!`);
    }
    let fullPath = path.resolve(process.env.ANDROID_HOME, this.toolPath);
    return await fs.exists(fullPath) ? ok(`${this.toolName} exists at: ${fullPath}`) :
      nok(`${this.toolName} could NOT be found at '${fullPath}'!`);
  }

  fix () {
    if (typeof process.env.ANDROID_HOME === 'undefined') {
      return 'Manually configure ANDROID_HOME and run appium-doctor again.';
    }
    return `Manually install ${this.toolName} and add it to PATH.`;
  }
}
checks.push(new AndroidToolCheck('adb',
  path.join("platform-tools", system.isWindows() ? 'adb.exe' : 'adb')));
checks.push(new AndroidToolCheck('android',
  path.join("tools", system.isWindows() ? 'android.bat' : 'android')));
checks.push(new AndroidToolCheck('emulator',
  path.join("tools", system.isWindows() ? 'emulator.exe' : 'emulator')));
checks.push(new JavaOnPathCheck());

export { EnvVarAndPathCheck, AndroidToolCheck, JavaOnPathCheck };
export default checks;
