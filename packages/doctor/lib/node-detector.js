import log from './logger';
import {resolveExecutablePath} from './utils';

// Look for node
class NodeDetector {
  static async retrieveUsingSystemCall() {
    const nodePath = await resolveExecutablePath('node');

    if (!nodePath) {
      log.debug(`Node binary not found in PATH: ${process.env.PATH}`);
      return null;
    }

    log.debug(`Node binary found at: ${nodePath}`);
    return nodePath;
  }

  static async detect() {
    const nodePath = await NodeDetector.retrieveUsingSystemCall();
    if (nodePath) {
      return nodePath;
    } else {
      log.warn('The node binary could not be found.');
      return null;
    }
  }
}

export default NodeDetector;
