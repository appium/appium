import { ok, nok, okOptional, nokOptional, resolveExecutablePath, getNpmPackageInfo } from './utils';
import { exec } from 'teen_process';
import { DoctorCheck } from './doctor';
import NodeDetector from './node-detector';
import { util } from '@appium/support';
import { EOL } from 'os';
import '@dabh/colors';

let checks = [];

// Node Binary
class NodeBinaryCheck extends DoctorCheck {
  async diagnose () {
    let nodePath = await NodeDetector.detect();
    return nodePath ? ok(`The Node.js binary was found at: ${nodePath}`) :
      nok('The Node.js binary was NOT found!');
  }

  fix () {
    return `Manually setup ${'Node.js'.bold}.`;
  }
}
checks.push(new NodeBinaryCheck());

const REQUIRED_NODE_VERSION = '10.0.0';

// Node version
class NodeVersionCheck extends DoctorCheck {
  async diagnose () {
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

  fix () {
    return `Manually upgrade ${'Node.js'.bold}.`;
  }
}
checks.push(new NodeVersionCheck());

class OptionalFfmpegCommandCheck extends DoctorCheck {
  async diagnose () {
    const ffmpegPath = await resolveExecutablePath('ffmpeg');
    return ffmpegPath
      ? okOptional(`ffmpeg is installed at: ${ffmpegPath}. ${(await exec('ffmpeg', ['-version'])).stdout.split(EOL)[0]}`)
      : nokOptional('ffmpeg cannot be found');
  }

  async fix () { // eslint-disable-line require-await
    return `${'ffmpeg'.bold} is needed to record screen features. Please read https://www.ffmpeg.org/ to install it`;
  }
}
checks.push(new OptionalFfmpegCommandCheck());


class OptionalMjpegConsumerCommandCheck extends DoctorCheck {
  async diagnose () {
    const packageName = 'mjpeg-consumer';
    const packageInfo = await getNpmPackageInfo(packageName);

    if (packageInfo) {
      return okOptional(`${packageName} is installed at: ${packageInfo.path}. Installed version is: ${packageInfo.version}`);
    }
    return nokOptional(`${packageName} cannot be found.`);
  }

  async fix () { // eslint-disable-line require-await
    return `${'mjpeg-consumer'.bold} module is required to use MJPEG-over-HTTP features. Please install it with 'npm i -g mjpeg-consumer'.`;
  }
}
checks.push(new OptionalMjpegConsumerCommandCheck());


export { NodeBinaryCheck, NodeVersionCheck, OptionalFfmpegCommandCheck,
  OptionalMjpegConsumerCommandCheck };
export default checks;
