import '@colors/colors';
import _ from 'lodash';
import { util, logger } from '@appium/support';

const log = logger.getLogger('Doctor');
const SKIP_AUTOFIX_ERROR_NAME = 'FixSkippedError';

export class Doctor {
  /**
   * @param {DoctorCheck[]} [checks=[]]
   */
  constructor(checks = []) {
    this.checks = checks;
    /** @type {DoctorIssue[]} */
    this.foundIssues = [];
  }

  /**
   * Register all the sub check and combine them together
   * @param {DoctorCheck[] | DoctorCheck} checks
   */
  register(checks) {
    this.checks.push(...(Array.isArray(checks) ? checks : [checks]));
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
    log.info(`### Starting doctor diagnostics  ###`);
    this.foundIssues = [];
    for (const check of this.checks) {
      const res = await check.diagnose();
      const issue = this.toIssue(res, check);
      if (issue) {
        this.foundIssues.push(issue);
      }
    }
    log.info(
      `### Diagnostic completed, ${this.buildFixMessage()}. ###`
    );
    log.info('');
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
        log.info(logMsg);
      }
      /** @type {string[]} */
      const fixMessages = [];
      for (const issue of issues) {
        const message = await issue.check.fix();
        if (message) {
          fixMessages.push(message);
        }
      }
      for (const m of _.uniq(fixMessages)) {
        log.warn(` \u279C ${m}`);
      }
      log.info('');
    };

    await handleIssues([
      '### Manual Fixes Needed ###',
      'The configuration cannot be automatically fixed, please do the following first:',
    ], manualIssues);
    await handleIssues([
      '### Optional Manual Fixes  ###',
      'The configuration can install optionally. Please do the following manually:',
    ], manualIssuesOptional);

    if (manualIssues.length > 0) {
      log.info('###');
      log.info('');
      log.info('Bye! Run doctor again when all manual fixes have been applied!');
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
      if (err.constructor.name === SKIP_AUTOFIX_ERROR_NAME) {
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
    const autoFixes = _.filter(this.foundIssues, (f) => f.check.hasAutofix());
    for (const f of autoFixes) {
      await this.runAutoFix(f);
      log.info('');
    }
    if (_.find(autoFixes, (f) => !f.fixed)) {
      // a few issues remain.
      log.info('Bye! A few issues remain, fix manually and/or rerun doctor!');
    } else {
      // nothing left to fix.
      log.info('Bye! All issues have been fixed!');
    }
    log.info('');
  }

  async run() {
    await this.diagnose();
    if (this.reportSuccess()) {
      return;
    }
    if (await this.reportManualIssues()) {
      return;
    }
    await this.runAutoFixes();
  }

  /**
   * @param {DoctorCheckResult} result
   * @param {DoctorCheck} check
   * @returns {DoctorIssue?}
   */
  toIssue(result, check) {
    if (result.ok) {
      log.info(` ${'\u2714'.green} ${result.message}`);
      return null;
    }

    const errorMessage = result.optional
      ? ` ${'\u2716'.yellow} ${result.message}`
      : ` ${'\u2716'.red} ${result.message}`;
    log.warn(errorMessage);
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
      log.info('Everything looks good, bye!');
      log.info('');
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