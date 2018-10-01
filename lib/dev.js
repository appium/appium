import { exec } from 'teen_process';
import { DoctorCheck } from './doctor';
import { ok, nok } from './utils';
import { fs, system } from 'appium-support';
import path from 'path';
import { EOL } from 'os';

let checks = [];

// Check PATH binaries
class BinaryIsInPathCheck extends DoctorCheck {
  constructor (binary) {
    super();
    this.binary = binary;
  }

  async diagnose () {
    let resolvedPath;
    try {
      let executable = system.isWindows() ? 'where' : 'which';
      let {stdout} = await exec(executable, [this.binary]);
      if (stdout.match(/not found/gi)) {
        throw new Error('Not Found');
      }
      resolvedPath = system.isWindows() ? stdout.split(EOL)[0] : stdout.replace(EOL, '');
    } catch (err) {
      return nok(`${this.binary} is MISSING in PATH!`);
    }
    return await fs.exists(resolvedPath) ? ok(`${this.binary} was found at ${resolvedPath}`) :
      nok(`${this.binary} was found in PATH at '${resolvedPath}', but this is NOT a valid path!`);
  }

  fix () {
    return `Manually install the ${this.binary} binary and add it to PATH.`;
  }
}

checks.push(new BinaryIsInPathCheck(system.isWindows() ? 'mvn.bat' : 'mvn'));
checks.push(new BinaryIsInPathCheck(system.isWindows() ? 'ant.bat' : 'ant'));
checks.push(new BinaryIsInPathCheck(system.isWindows() ? 'adb.exe' : 'adb'));

// Check Android SDKs
class AndroidSdkExists extends DoctorCheck {
  constructor (sdk) {
    super();
    this.sdk = sdk;
  }

  async diagnose () {
    if (typeof process.env.ANDROID_HOME === 'undefined') {
      return nok(`${this.sdk} could not be found because ANDROID_HOME is NOT set!`);
    }
    let sdkPath = path.resolve(process.env.ANDROID_HOME, path.join("platforms", this.sdk));
    return await fs.exists(sdkPath) ? ok(`${this.sdk} was found at: ${sdkPath}`) :
      nok(`${this.sdk} could NOT be found at '${sdkPath}'!`);
  }

  fix () {
    if (typeof process.env.ANDROID_HOME === "undefined") {
      return 'Manually configure ANDROID_HOME.';
    }
    return `Manually install the ${this.sdk} sdk.`;
  }
}

checks.push(new AndroidSdkExists('android-16'));
checks.push(new AndroidSdkExists('android-19'));

export { BinaryIsInPathCheck, AndroidSdkExists };
export default checks;
