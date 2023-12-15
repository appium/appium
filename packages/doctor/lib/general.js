import {ok, nok, okOptional, nokOptional, resolveExecutablePath, getNpmPackageInfo} from './utils';
import {exec} from 'teen_process';
import {DoctorCheck} from './doctor';
import NodeDetector from './node-detector';
import {util, env} from '@appium/support';
import '@colors/colors';

/**
 * @type {import('./factory').DoctorCheckList}
 */
const checks = [];

export class AppiumHomeCheck extends DoctorCheck {
  /**
   * @override
   */
  async diagnose() {
    return ok(`APPIUM_HOME is ${await env.resolveAppiumHome()}`);
  }

  /**
   * @override
   */
  async fix() {
    return null;
  }
}
checks.push(new AppiumHomeCheck());

// Node Binary
export class NodeBinaryCheck extends DoctorCheck {
  /**
   * @override
   */
  async diagnose() {
    let nodePath = await NodeDetector.detect();
    return nodePath
      ? ok(`The Node.js binary was found at: ${nodePath}`)
      : nok('The Node.js binary was NOT found!');
  }

  /**
   * @override
   */
  async fix() {
    return `Manually setup ${'Node.js'.bold}.`;
  }
}
checks.push(new NodeBinaryCheck());

const REQUIRED_NODE_VERSION = '14.0.0';

// Node version
export class NodeVersionCheck extends DoctorCheck {
  /**
   * @override
   */
  async diagnose() {
    let nodePath = await NodeDetector.detect();
    if (!nodePath) {
      return nok('Node is not installed, so no version to check!');
    }
    let {stdout} = await exec(nodePath, ['--version']);
    let versionString = stdout.replace('v', '').trim();
    try {
      return util.compareVersions(REQUIRED_NODE_VERSION, '<=', versionString)
        ? ok(`Node version is ${versionString}`)
        : nok(`Node version should be at least ${REQUIRED_NODE_VERSION}!`);
    } catch {
      return nok(`Unable to find node version (version = '${versionString}')`);
    }
  }

  /**
   * @override
   */
  async fix() {
    return `Manually upgrade ${'Node.js'.bold}.`;
  }
}
checks.push(new NodeVersionCheck());

export class OptionalFfmpegCommandCheck extends DoctorCheck {
  /**
   * @override
   */
  async diagnose() {
    const ffmpegPath = await resolveExecutablePath('ffmpeg');
    return ffmpegPath
      ? okOptional(
          `ffmpeg is installed at: ${ffmpegPath}. ${
            (await exec('ffmpeg', ['-version'])).stdout.split('\n')[0]
          }`
        )
      : nokOptional('ffmpeg cannot be found');
  }

  /**
   * @override
   */
  async fix() {
    return `${
      'ffmpeg'.bold
    } is needed to record screen features. Please read https://www.ffmpeg.org/ to install it`;
  }
}
checks.push(new OptionalFfmpegCommandCheck());

export class OptionalMjpegConsumerCommandCheck extends DoctorCheck {
  /**
   * @override
   */
  async diagnose() {
    const packageName = 'mjpeg-consumer';
    const packageInfo = await getNpmPackageInfo(packageName);

    if (packageInfo) {
      return okOptional(
        `${packageName} is installed at: ${packageInfo.path}. Installed version is: ${packageInfo.version}`
      );
    }
    return nokOptional(`${packageName} cannot be found.`);
  }

  /**
   * @override
   */
  async fix() {
    return `${
      'mjpeg-consumer'.bold
    } module is required to use MJPEG-over-HTTP features. Please install it with 'npm i -g mjpeg-consumer'.`;
  }
}
checks.push(new OptionalMjpegConsumerCommandCheck());

export default checks;

/**
 * @typedef {import('./utils').CheckResult} UtilsResult
 */
