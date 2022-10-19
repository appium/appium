import {fs} from '@appium/support';
import log from './logger';
import {resolveExecutablePath} from './utils';

const NODE_COMMON_PATHS = [process.env.NODE_BIN, '/usr/local/bin/node', '/opt/local/bin/node'];

// Look for node
class NodeDetector {
  static async retrieveInCommonPlaces() {
    for (let p of NODE_COMMON_PATHS) {
      if (p && (await fs.exists(p))) {
        log.debug(`Node binary found at common place: ${p}`);
        return p;
      }
    }
    log.debug("Node binary wasn't found at common places.");
    return null;
  }

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
    let nodePath =
      (await NodeDetector.retrieveUsingSystemCall()) ||
      (await NodeDetector.retrieveInCommonPlaces());
    if (nodePath) {
      return nodePath;
    } else {
      log.warn('The node binary could not be found.');
      return null;
    }
  }
}

export default NodeDetector;
