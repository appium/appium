import { fs } from './utils';
import { DoctorCheck } from './doctor';
import { ok, nok } from './utils';
import { system } from 'appium-support';
import path from 'path';
let checks = [];

// Check env variables

class EnvVarAndPathCheck extends DoctorCheck {
  constructor (varName) {
    super();
    this.varName = varName;
  }

  async diagnose () {
    let varValue = process.env[this.varName];
    if (typeof varValue === 'undefined') {
      return nok(`${this.varName} is NOT set!`);
    }
    return await fs.exists(varValue) ? ok(`${this.varName} is set to: ${varValue}`) :
       nok(`${this.varName} is set to \'${varValue}\' but this is NOT a valid path!`);
  }

  fix() {
    return `Manually configure ${this.varName}.`;
  }
}

checks.push(new EnvVarAndPathCheck('ANDROID_HOME'));
checks.push(new EnvVarAndPathCheck('JAVA_HOME'));

// Check tools

class AndroidToolCheck extends DoctorCheck {
  constructor(toolName, toolPath) {
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
      nok(`${this.toolName} could NOT be found at \'${fullPath}\'!`);
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

export { EnvVarAndPathCheck, AndroidToolCheck };
export default checks;
