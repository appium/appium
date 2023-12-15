// demo rule to test the gui

import {ok, nok} from './utils';
import {fs} from '@appium/support';
import {exec} from 'teen_process';
import {DoctorCheck, FixSkippedError} from './doctor';
import log from './logger';
import {fixIt} from './prompt';

/**
 * @type {import('./factory').DoctorCheckList}
 */
const checks = [];

export class DirCheck extends DoctorCheck {
  /**
   * @param {string} path
   */
  constructor(path) {
    super({autofix: false});
    this.path = path;
  }

  /**
   * @override
   */
  async diagnose() {
    if (!(await fs.exists(this.path))) {
      return nok(`Could NOT find directory at '${this.path}'!`);
    }
    let stats = await fs.lstat(this.path);
    return stats.isDirectory()
      ? ok(`Found directory at: ${this.path}`)
      : nok(`'${this.path}' is NOT a directory!`);
  }

  /**
   * @override
   */
  async fix() {
    return `Manually create a directory at: ${this.path}`;
  }
}

checks.push(new DirCheck('/tmp/appium-doctor'));
checks.push(new DirCheck('/tmp/appium-doctor/demo'));

export class FileCheck extends DoctorCheck {
  /**
   * @param {string} path
   */
  constructor(path) {
    super({autofix: true});
    this.path = path;
  }

  /**
   * @override
   */
  async diagnose() {
    return (await fs.exists(this.path))
      ? ok(`Found file at: ${this.path}`)
      : nok(`Could NOT find file at '${this.path}'!`);
  }

  /**
   * @override
   */
  async fix() {
    log.info(`The following command need be executed: touch '${this.path}'`);
    let yesno = await fixIt();
    if (yesno === 'yes') {
      await exec('touch', [this.path]);
    } else {
      log.info(`Skipping. You will need to touch '${this.path}' manually.`);
      throw new FixSkippedError('bbb');
    }
    return null;
  }
}

checks.push(
  new FileCheck('/tmp/appium-doctor/demo/apple.fruit'),
  new FileCheck('/tmp/appium-doctor/demo/pear.fruit'),
  new FileCheck('/tmp/appium-doctor/demo/orange.fruit'),
);

export default checks;
