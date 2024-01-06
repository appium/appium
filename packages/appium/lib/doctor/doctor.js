import '@colors/colors';
import _ from 'lodash';
import { util, doctor, logger } from '@appium/support';

export const EXIT_CODE = /** @type {const} */ Object.freeze({
  SUCCESS: 0,
  HAS_MAJOR_ISSUES: 127,
});

export class Doctor {
  /**
   * @param {DoctorCheck[]} [checks=[]]
   */
  constructor(checks = []) {
    this.log = logger.getLogger('Doctor');
    /** @type {DoctorCheck[]} */
    this.checks = checks;
    this.checks
      .filter((c) => _.isNil(c.log))
      .forEach((c) => { c.log = this.log; });
    /** @type {DoctorIssue[]} */
    this.foundIssues = [];
  }

  /**
   * @returns {DoctorIssue[]}
   */
  get issuesRequiredToFix() {
    return this.foundIssues.filter((f) => !f.check.isOptional());
  }

  /**
   * @returns {DoctorIssue[]}
   */
  get issuesOptionalToFix() {
    return this.foundIssues.filter((f) => f.check.isOptional());
  }

  /**
   * The doctor shows the report
   */
  async diagnose() {
    this.log.info(`### Starting doctor diagnostics  ###`);
    this.foundIssues = [];
    for (const check of this.checks) {
      const res = await check.diagnose();
      const issue = this.toIssue(res, check);
      if (issue) {
        this.foundIssues.push(issue);
      }
    }
    this.log.info(
      `### Diagnostic completed, ${this.buildFixMessage()}. ###`
    );
    this.log.info('');
  }

  /**
   * @returns {Promise<boolean>}
   */
  async reportManualIssues() {
    const manualIssues = _.filter(this.issuesRequiredToFix, (f) => !f.check.hasAutofix());
    const manualIssuesOptional = _.filter(this.issuesOptionalToFix, (f) => !f.check.hasAutofix());

    const handleIssues = async (headerLogs, issues) => {
      if (_.isEmpty(issues)) {
        return;
      }

      for (const logMsg of headerLogs) {
        this.log.info(logMsg);
      }
      /** @type {string[]} */
      const fixMessages = [];
      for (const issue of issues) {
        let message;
        try {
          message = await issue.check.fix();
        } catch (e) {
          message = e.message;
        }
        if (message) {
          fixMessages.push(message);
        }
      }
      for (const m of _.uniq(fixMessages)) {
        this.log.warn(` \u279C ${m}`);
      }
      this.log.info('');
    };

    await handleIssues([
      '### Manual Fixes Needed ###',
      'The configuration cannot be automatically fixed, please do the following first:',
    ], manualIssues);
    await handleIssues([
      '### Optional Manual Fixes ###',
      'To fix these optional issues, please do the following manually:',
    ], manualIssuesOptional);

    if (manualIssues.length > 0) {
      this.log.info('###');
      this.log.info('');
      this.log.info('Bye! Run doctor again when all manual fixes have been applied!');
      this.log.info('');
      return true;
    }
    return false;
  }

  /**
   * @param {DoctorIssue} f
   */
  async runAutoFix(f) {
    this.log.info(`### Fixing: ${f.error} ###`);
    try {
      await f.check.fix();
    } catch (err) {
      if (err.constructor.name === doctor.FixSkippedError.name) {
        this.log.info(`### Skipped fix ###`);
        return;
      } else {
        this.log.warn(`${err}`.replace(/\n$/g, ''));
        this.log.info(`### Fix did not succeed ###`);
        return;
      }
    }
    this.log.info('Checking if this was fixed:');
    const res = await f.check.diagnose();
    if (res.ok) {
      f.fixed = true;
      this.log.info(` ${'\u2714'.green} ${res.message}`);
      this.log.info(`### Fix was successfully applied ###`);
    } else {
      this.log.info(` ${'\u2716'.red} ${res.message}`);
      this.log.info(`### Fix was applied but issue remains ###`);
    }
  }

  /**
   * @returns {Promise<boolean>}
   */
  async runAutoFixes() {
    const autoFixes = _.filter(this.foundIssues, (f) => f.check.hasAutofix());
    for (const f of autoFixes) {
      await this.runAutoFix(f);
      this.log.info('');
    }
    if (_.find(autoFixes, (f) => !f.fixed)) {
      // a few issues remain.
      this.log.info('Bye! A few issues remain, fix manually and/or rerun doctor!');
      this.log.info('');
      return false;
    }
    // nothing left to fix.
    this.log.info('Bye! All issues have been fixed!');
    this.log.info('');
    return true;
  }

  /**
   * @returns {Promise<EXIT_CODE[keyof EXIT_CODE]>}
   */
  async run() {
    await this.diagnose();
    if (this.reportSuccess()) {
      return EXIT_CODE.SUCCESS;
    }
    if (await this.reportManualIssues()) {
      return EXIT_CODE.HAS_MAJOR_ISSUES;
    }
    if (!await this.runAutoFixes()) {
      return EXIT_CODE.HAS_MAJOR_ISSUES;
    }
    return EXIT_CODE.SUCCESS;
  }

  /**
   * @param {DoctorCheckResult} result
   * @param {DoctorCheck} check
   * @returns {DoctorIssue?}
   */
  toIssue(result, check) {
    if (result.ok) {
      this.log.info(` ${'\u2714'.green} ${result.message}`);
      return null;
    }

    const errorMessage = result.optional
      ? ` ${'\u2716'.yellow} ${result.message}`
      : ` ${'\u2716'.red} ${result.message}`;
    this.log.warn(errorMessage);
    return {
      error: errorMessage,
      check,
    };
  }

  /**
   * @returns {string}
   */
  buildFixMessage() {
    return `${util.pluralize('required fix', this.issuesRequiredToFix.length, true)} needed, ` +
      `${util.pluralize('optional fix', this.issuesOptionalToFix.length, true)} possible`;
  }

  /**
   * @returns {boolean}
   */
  reportSuccess() {
    if (this.issuesRequiredToFix.length === 0 && this.issuesOptionalToFix.length === 0) {
      this.log.info('Everything looks good, bye!');
      this.log.info('');
      return true;
    }
    return false;
  }
}

/**
 * @typedef DoctorIssue
 * @property {DoctorCheck} check
 * @property {string} error
 * @property {boolean} [fixed]
 */

/**
 * @typedef {import('@appium/types').IDoctorCheck} DoctorCheck
 * @typedef {import('@appium/types').DoctorCheckResult} DoctorCheckResult
 */