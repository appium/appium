import { fs } from 'appium-support';
import { exec } from 'teen_process';
import log from './logger';

class CarthageDetector {
  static async detect () {
    let stdout;
    try {
      stdout = (await exec('which', ['carthage'])).stdout;
      let carthagePath = stdout.replace("\n", "");
      if (await fs.exists(carthagePath)) {
        log.debug(`Carthage was found at: ${carthagePath}`);
        return carthagePath;
      }
    } catch (ign) {}

    log.debug('Carthage was NOT found!');
    return null;
  }
}

export default CarthageDetector;
