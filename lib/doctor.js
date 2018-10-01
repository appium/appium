import 'colors';
import _ from 'lodash';
import log from './logger';
import { version } from '../../package.json'; // eslint-disable-line import/no-unresolved


class FixSkippedError extends Error {
}

class DoctorCheck {
  constructor (opts = {}) {
    this.autofix = !!opts.autofix;
  }

  diagnose () { throw new Error('Not Implemented!'); }

  fix () {
    // return string for manual fixes.
    throw new Error('Not Implemented!');
  }
}

class Doctor {
  constructor () {
    this.checks = [];
    this.toFix = [];
  }

  register (checks) {
    checks = Array.isArray(checks) ? checks : [checks];
    this.checks = this.checks.concat(checks);
  }

  async diagnose () {
    log.info('### Diagnostic starting ###');
    this.toFix = [];
    for (let check of this.checks) {
      let res = await check.diagnose();
      if (res.ok) {
        log.info(` ${'\u2714'.green} ${res.message}`);
      } else {
        let errorMessage = ` ${'\u2716'.red} ${res.message}`;
        log.warn(errorMessage);
        this.toFix.push({
          error: errorMessage,
          check
        });
      }
    }
    let fixMessage;
    switch (this.toFix.length) {
      case 0:
        fixMessage = 'no fix needed';
        break;
      case 1:
        fixMessage = 'one fix needed';
        break;
      default:
        fixMessage = `${this.toFix.length} fixes needed`;
    }
    log.info(`### Diagnostic completed, ${fixMessage}. ###`);
    log.info('');
  }

  async reportSuccess () { // eslint-disable-line require-await
    if (this.toFix.length === 0) {
      log.info('Everything looks good, bye!');
      log.info('');
      return true;
    } else {
      return false;
    }
  }

  async reportManualFixes () {
    let manualFixes = _.filter(this.toFix, (f) => {return !f.check.autofix;});
    if (manualFixes.length > 0) {
      log.info('### Manual Fixes Needed ###');
      log.info('The configuration cannot be automatically fixed, please do the following first:');
      // for manual fixes, the fix method always return a string
      let fixMessages = [];
      for (let f of manualFixes) {
        fixMessages.push(await f.check.fix());
      }
      for (let m of _.uniq(fixMessages)) {
        log.warn(`- ${m}`);
      }
      log.info('###');
      log.info('');
      log.info('Bye! Run appium-doctor again when all manual fixes have been applied!');
      log.info('');
      return true;
    } else {
      return false;
    }
  }

  async runAutoFix (f) {
    log.info(`### Fixing: ${f.error} ###`);
    try {
      await f.check.fix();
    } catch (err) {
      if (err instanceof FixSkippedError) {
        log.info(`### Skipped fix ###`);
        return;
      } else {
        log.warn(`${err}`.replace(/\n$/g, ''));
        log.info(`### Fix did not succeed ###`);
        return;
      }
    }
    log.info('Checking if this was fixed:');
    let res = await f.check.diagnose();
    if (res.ok) {
      f.fixed = true;
      log.info(` ${'\u2714'.green} ${res.message}`);
      log.info(`### Fix was successfully applied ###`);
    } else {
      log.info(` ${'\u2716'.red} ${res.message}`);
      log.info(`### Fix was applied but issue remains ###`);
    }
  }

  async runAutoFixes () {
    let autoFixes = _.filter(this.toFix, (f) => {return f.check.autofix;});
    for (let f of autoFixes) {
      await this.runAutoFix(f);
      log.info('');
    }
    if (_.find(autoFixes, (f) => { return !f.fixed; })) {
      // a few issues remain.
      log.info('Bye! A few issues remain, fix manually and/or rerun appium-doctor!');
    } else {
      // nothing left to fix.
      log.info('Bye! All issues have been fixed!');
    }
    log.info('');
  }

  async run () {
    log.info(`Appium Doctor v.${version}`);
    await this.diagnose();
    if (await this.reportSuccess()) {
      return;
    }
    if (await this.reportManualFixes()) {
      return;
    }
    await this.runAutoFixes();
  }
}

export { Doctor, DoctorCheck, FixSkippedError };
