import log from './logger';
import { resolveExecutablePath } from './utils';

class CarthageDetector {
  static async detect () {
    const carthagePath = await resolveExecutablePath('carthage');

    if (!carthagePath) {
      log.debug(`Carthage was not found in PATH: ${process.env.PATH}`);
      return null;
    }

    log.debug(`Carthage was found at: ${carthagePath}`);
    return carthagePath;
  }
}

export default CarthageDetector;
