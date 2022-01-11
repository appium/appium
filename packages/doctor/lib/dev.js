import { DoctorCheck } from './doctor';
import { ok, nok, resolveExecutablePath } from './utils';
import { fs, system } from '@appium/support';
import path from 'path';
import '@dabh/colors';

let checks = [];

// Check PATH binaries
class BinaryIsInPathCheck extends DoctorCheck {
  constructor (binary) {
    super();
    this.binary = binary;
  }

  async diagnose () {
    const resolvedPath = await resolveExecutablePath(this.binary);
    if (!resolvedPath) {
      return nok(`${this.binary} is MISSING in PATH: ${process.env.PATH}`);
    }

    return ok(`${this.binary} was found at ${resolvedPath}`);
  }

  fix () {
    return `Manually install the ${this.binary.bold} binary and add it to ${'PATH'.bold}.`;
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
    let sdkPath = path.resolve(process.env.ANDROID_HOME, path.join('platforms', this.sdk));
    return await fs.exists(sdkPath) ? ok(`${this.sdk} was found at: ${sdkPath}`) :
      nok(`${this.sdk} could NOT be found at '${sdkPath}'!`);
  }

  fix () {
    if (typeof process.env.ANDROID_HOME === 'undefined') {
      return `Manually configure ${'ANDROID_HOME'.bold}.`;
    }
    return `Manually install the ${this.sdk.bold} sdk.`;
  }
}

checks.push(new AndroidSdkExists('android-16'));
checks.push(new AndroidSdkExists('android-19'));

export { BinaryIsInPathCheck, AndroidSdkExists };
export default checks;
