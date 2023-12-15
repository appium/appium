import {DoctorCheck} from './doctor';
import {ok, nok, resolveExecutablePath} from './utils';
import {fs, system} from '@appium/support';
import path from 'path';
import '@colors/colors';

/**
 * @type {import('./factory').DoctorCheckList}
 */
const checks = [];

// Check PATH binaries
export class BinaryIsInPathCheck extends DoctorCheck {
  /**
   * @param {string} binary
   */
  constructor(binary) {
    super();
    this.binary = binary;
  }

  /**
   * @override
   */
  async diagnose() {
    const resolvedPath = await resolveExecutablePath(this.binary);
    if (!resolvedPath) {
      return nok(`${this.binary} is MISSING in PATH: ${process.env.PATH}`);
    }

    return ok(`${this.binary} was found at ${resolvedPath}`);
  }

  /**
   * @override
   */
  async fix() {
    return `Manually install the ${this.binary.bold} binary and add it to ${'PATH'.bold}.`;
  }
}

checks.push(
  new BinaryIsInPathCheck(system.isWindows() ? 'mvn.bat' : 'mvn'),
  new BinaryIsInPathCheck(system.isWindows() ? 'ant.bat' : 'ant'),
  new BinaryIsInPathCheck(system.isWindows() ? 'adb.exe' : 'adb'),
);

// Check Android SDKs
export class AndroidSdkExists extends DoctorCheck {
  /**
   * @param {string} sdk
   */
  constructor(sdk) {
    super();
    this.sdk = sdk;
  }

  /**
   * @override
   */
  async diagnose() {
    if (typeof process.env.ANDROID_HOME === 'undefined') {
      return nok(`${this.sdk} could not be found because ANDROID_HOME is NOT set!`);
    }
    let sdkPath = path.resolve(process.env.ANDROID_HOME, path.join('platforms', this.sdk));
    return (await fs.exists(sdkPath))
      ? ok(`${this.sdk} was found at: ${sdkPath}`)
      : nok(`${this.sdk} could NOT be found at '${sdkPath}'!`);
  }

  /**
   * @override
   */
  async fix() {
    if (typeof process.env.ANDROID_HOME === 'undefined') {
      return `Manually configure ${'ANDROID_HOME'.bold}.`;
    }
    return `Manually install the ${this.sdk.bold} sdk.`;
  }
}

checks.push(
  new AndroidSdkExists('android-16'),
  new AndroidSdkExists('android-19'),
);

export default checks;
