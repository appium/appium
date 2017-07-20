import { ok, nok } from './utils';
import { exec } from 'teen_process';
import { DoctorCheck } from './doctor';
import NodeDetector from './node-detector';


let checks = [];

// Node Binary
class NodeBinaryCheck extends DoctorCheck {
  async diagnose () {
    let nodePath = await NodeDetector.detect();
    return nodePath ? ok(`The Node.js binary was found at: ${nodePath}`) :
      nok('The Node.js binary was NOT found!');
  }

  fix () {
    return `Manually setup Node.js.`;
  }
}
checks.push(new NodeBinaryCheck());

// Node version
class NodeVersionCheck extends DoctorCheck {
  async diagnose () {
    let nodePath = await NodeDetector.detect();
    if (!nodePath) {
      return nok('Node is not installed, so no version to check!');
    }
    let {stdout} = await exec(nodePath, ['--version']);
    let versionString = stdout.replace('v', '').trim();
    let version = parseInt(versionString, 10);
    if (Number.isNaN(version)) {
      return nok(`Unable to find node version (version = '${versionString}')`);
    }
    return version >= 4 ? ok(`Node version is ${versionString}`) :
      nok('Node version should be at least 4!');
  }

  fix () {
    return `Manually upgrade Node.js.`;
  }
}
checks.push(new NodeVersionCheck());

export { NodeBinaryCheck, NodeVersionCheck };
export default checks;
