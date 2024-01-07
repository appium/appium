import '@colors/colors';
import _ from 'lodash';
import log from './logger';
import {fs} from '@appium/support';

const {version} = fs.readPackageJsonFrom(__dirname);

class FixSkippedError extends Error {}

/**
 * Create interface for other Doctors
 */
class DoctorCheck {
  /**
   * @param {DoctorOpts} [opts={}]
   */
  constructor(opts = {}) {
    this.autofix = !!opts.autofix;
  }

  /**
   * Every doctor diagnose the symptoms
   * @returns {Promise<import('./utils').CheckResult>}
   * @throws {Error}
   */
  async diagnose() {
    throw new Error('Not Implemented!');
  }

  /**
   * Every doctor suggest the solutions to fix the sickness
   * @returns {Promise<string|null>}
   * @throws {Error}
   */
  async fix() {
    // return string for manual fixes.
    throw new Error('Not Implemented!');
  }
}

class Doctor {
  constructor() {
    /**
     * All the sub check goes here after register
     * @type {DoctorCheck[]}
     */
    this.checks = [];
    /** @type {DoctorCheck[]} */
    this.checkOptionals = [];
    /** @type {DoctorIssue[]} */
    this.toFix = [];
    /** @type {DoctorIssue[]} */
    this.toFixOptionals = [];
  }

  /**
   * Register all the sub check and combine them together
   * @param {DoctorCheck[] | DoctorCheck} checks
   */
  register(checks) {
    this.checks.push(...(Array.isArray(checks) ? checks : [checks]));
  }

  /**
   * The doctor shows the report
   */
  async diagnose() {
    log.info(`### Diagnostic for ${'necessary'.green} dependencies starting ###`);
    this.toFix = [];
    for (const check of this.checks) {
      const res = await check.diagnose();
      if (res.optional) {
        this.checkOptionals.push(check);
        continue;
      }
      await this.diagnosticResultMessage(res, this.toFix, check);
    }
    log.info(
      `### Diagnostic for necessary dependencies completed, ${await this.fixMessage(
        this.toFix.length
      )}. ###`
    );
    log.info('');

    log.info(`### Diagnostic for ${'optional'.yellow} dependencies starting ###`);
    this.toFixOptionals = [];
    for (const checkOptional of this.checkOptionals) {
      await this.diagnosticResultMessage(
        await checkOptional.diagnose(),
        this.toFixOptionals,
        checkOptional
      );
    }
    log.info(
      `### Diagnostic for optional dependencies completed, ${await this.fixMessage(
        this.toFixOptionals.length,
        true
      )}. ###`
    );
    log.info('');
  }

  /**
   * @param {DoctorIssue[]} fixes
   * @param {DoctorIssue[]} optionalFixes
   */
  async reportManualFixes(fixes, optionalFixes) {
    const manualFixes = _.filter(fixes, (f) => !f?.check?.autofix);
    const manualFixesOptional = _.filter(optionalFixes, (f) => !f?.check?.autofix);

    if (manualFixes.length > 0) {
      log.info('### Manual Fixes Needed ###');
      log.info('The configuration cannot be automatically fixed, please do the following first:');
      /** @type {string[]} */
      const fixMessages = [];
      for (const f of manualFixes) {
        const message = await f.check.fix();
        if (message) {
          fixMessages.push(message);
        }
      }
      for (const m of _.uniq(fixMessages)) {
        log.warn(` \u279C ${m}`);
      }
      log.info('');
    }
    if (manualFixesOptional.length > 0) {
      log.info('### Optional Manual Fixes ###');
      log.info('The configuration can install optionally. Please do the following manually:');
      /** @type {string[]} */
      const fixMessages = [];
      for (const f of manualFixesOptional) {
        const message = await f.check.fix();
        if (message) {
          fixMessages.push(message);
        }
      }
      for (const m of _.uniq(fixMessages)) {
        log.warn(` \u279C ${m}`);
      }
      log.info('');
    }

    if (manualFixes.length > 0 || manualFixesOptional.length > 0) {
      log.info('###');
      log.info('');
      log.info('Bye! Run appium-doctor again when all manual fixes have been applied!');
      log.info('');
      return true;
    }
    return false;
  }

  /**
   * @param {DoctorIssue} f
   */
  async runAutoFix(f) {
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
    const res = await f.check.diagnose();
    if (res.ok) {
      f.fixed = true;
      log.info(` ${'\u2714'.green} ${res.message}`);
      log.info(`### Fix was successfully applied ###`);
    } else {
      log.info(` ${'\u2716'.red} ${res.message}`);
      log.info(`### Fix was applied but issue remains ###`);
    }
  }

  async runAutoFixes() {
    const autoFixes = _.filter(this.toFix, (f) => f?.check?.autofix);
    for (const f of autoFixes) {
      await this.runAutoFix(f);
      log.info('');
    }
    if (_.find(autoFixes, (f) => !f.fixed)) {
      // a few issues remain.
      log.info('Bye! A few issues remain, fix manually and/or rerun appium-doctor!');
    } else {
      // nothing left to fix.
      log.info('Bye! All issues have been fixed!');
    }
    log.info('');
  }

  async run() {
    log.info(`Appium Doctor v.${version}`);
    log.warn(`This package is deprecated since the Appium server version 2.4.0 and will be removed in the future.`);
    log.warn(`Use doctor checks (if any exist) integrated into your installed driver or plugin by ` +
      `running \`appium driver doctor <driver_name>\` or \`appium plugin doctor <plugin_name>\`.`);
    await this.diagnose();
    if (await this.reportSuccess(this.toFix.length, this.toFixOptionals.length)) {
      return;
    }
    if (await this.reportManualFixes(this.toFix, this.toFixOptionals)) {
      return;
    }
    await this.runAutoFixes();
  }

  /**
   * Generating messages
   *
   * @param {import('./utils').CheckResult} result
   * @param {DoctorIssue[]} toFixList
   * @param {DoctorCheck} check
   */
  async diagnosticResultMessage(result, toFixList, check) {
    if (result.ok) {
      log.info(` ${'\u2714'.green} ${result.message}`);
    } else {
      const errorMessage = result.optional
        ? ` ${'\u2716'.yellow} ${result.message}`
        : ` ${'\u2716'.red} ${result.message}`;
      log.warn(errorMessage);
      toFixList.push({
        error: errorMessage,
        check,
      });
    }
  }

  /**
   * @param {number} length
   * @param {boolean} [optional=false]
   * @returns {Promise<string>}
   */
  async fixMessage(length, optional = false) {
    let message;
    switch (length) {
      case 0:
        message = 'no fix';
        break;
      case 1:
        message = 'one fix';
        break;
      default:
        message = `${length} fixes`;
    }
    return `${message} ${optional ? 'possible' : 'needed'}`;
  }

  /**
   * @param {number} length
   * @param {number} lengthOptional
   * @returns {Promise<boolean>}
   */
  async reportSuccess(length, lengthOptional) {
    if (length === 0 && lengthOptional === 0) {
      log.info('Everything looks good, bye!');
      log.info('');
      return true;
    } else {
      return false;
    }
  }
}

export {Doctor, DoctorCheck, FixSkippedError};

/**
 * @typedef DoctorOpts
 * @property {boolean?} [autofix]
 */

/**
 * @typedef DoctorIssue
 * @property {DoctorCheck} check
 * @property {string} error
 * @property {boolean} [fixed]
 */