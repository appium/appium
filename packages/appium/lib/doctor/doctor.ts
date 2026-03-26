import '@colors/colors';
import _ from 'lodash';
import {util, doctor, logger} from '@appium/support';
import type {AppiumLogger, DoctorCheckResult, IDoctorCheck} from '@appium/types';

/**
 * Process exit codes returned by {@link Doctor.run}.
 */
export const EXIT_CODE = Object.freeze({
  SUCCESS: 0,
  HAS_MAJOR_ISSUES: 127,
} as const);

/** Exit code values produced by {@link Doctor.run}. */
export type DoctorExitCode = (typeof EXIT_CODE)[keyof typeof EXIT_CODE];

/**
 * A failed check reported during {@link Doctor} diagnostics.
 */
export interface DoctorIssue {
  /** The check that produced this issue. */
  check: IDoctorCheck;
  /** Colored message string as logged during diagnosis. */
  error: string;
  /** Set after a successful automatic fix attempt. */
  fixed?: boolean;
}

/**
 * Runs doctor checks and orchestrates manual/automatic fixes.
 */
export class Doctor {
  private readonly log: AppiumLogger;
  private readonly checks: IDoctorCheck[];
  private foundIssues: DoctorIssue[];

  /**
   * @param checks - Checks to run. Checks without a logger receive this instance logger.
   */
  constructor(checks: IDoctorCheck[] = []) {
    this.log = logger.getLogger('Doctor');
    this.checks = checks;
    this.checks
      .filter((c) => _.isNil(c.log))
      .forEach((c) => {
        c.log = this.log;
      });
    this.foundIssues = [];
  }

  /**
   * Runs diagnostics, reports issues, attempts automatic fixes where supported, and returns an exit code.
   *
   * @returns {@link EXIT_CODE.SUCCESS} when there are no issues or all issues were resolved;
   *   {@link EXIT_CODE.HAS_MAJOR_ISSUES} when manual intervention is still required or fixes failed.
   */
  async run(): Promise<DoctorExitCode> {
    await this.diagnose();
    if (this.reportSuccess()) {
      return EXIT_CODE.SUCCESS;
    }
    if (await this.reportManualIssues()) {
      return EXIT_CODE.HAS_MAJOR_ISSUES;
    }
    if (!(await this.runAutoFixes())) {
      return EXIT_CODE.HAS_MAJOR_ISSUES;
    }
    return EXIT_CODE.SUCCESS;
  }

  private get issuesRequiredToFix(): DoctorIssue[] {
    return this.foundIssues.filter((f) => !f.check.isOptional());
  }

  private get issuesOptionalToFix(): DoctorIssue[] {
    return this.foundIssues.filter((f) => f.check.isOptional());
  }

  /**
   * The doctor shows the report
   */
  private async diagnose(): Promise<void> {
    this.log.info(`### Starting doctor diagnostics  ###`);
    this.foundIssues = [];
    for (const check of this.checks) {
      const res = await check.diagnose();
      const issue = this.toIssue(res, check);
      if (issue) {
        this.foundIssues.push(issue);
      }
    }
    this.log.info(`### Diagnostic completed, ${this.buildFixMessage()}. ###`);
    this.log.info('');
  }

  private async reportManualIssues(): Promise<boolean> {
    const manualIssues = _.filter(this.issuesRequiredToFix, (f) => !f.check.hasAutofix());
    const manualIssuesOptional = _.filter(this.issuesOptionalToFix, (f) => !f.check.hasAutofix());

    const handleIssues = async (headerLogs: string[], issues: DoctorIssue[]): Promise<void> => {
      if (_.isEmpty(issues)) {
        return;
      }

      for (const logMsg of headerLogs) {
        this.log.info(logMsg);
      }
      const fixMessages: string[] = [];
      for (const issue of issues) {
        let message: string | null;
        try {
          message = await issue.check.fix();
        } catch (e) {
          message = (e as Error).message;
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

    await handleIssues(
      [
        '### Manual Fixes Needed ###',
        'The configuration cannot be automatically fixed, please do the following first:',
      ],
      manualIssues
    );
    await handleIssues(
      [
        '### Optional Manual Fixes ###',
        'To fix these optional issues, please do the following manually:',
      ],
      manualIssuesOptional
    );

    if (manualIssues.length > 0) {
      this.log.info('###');
      this.log.info('');
      this.log.info('Bye! Run doctor again when all manual fixes have been applied!');
      this.log.info('');
      return true;
    }
    return false;
  }

  private async runAutoFix(f: DoctorIssue): Promise<void> {
    this.log.info(`### Fixing: ${f.error} ###`);
    try {
      await f.check.fix();
    } catch (err) {
      if (err instanceof doctor.FixSkippedError) {
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

  private async runAutoFixes(): Promise<boolean> {
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

  private toIssue(result: DoctorCheckResult, check: IDoctorCheck): DoctorIssue | null {
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

  private buildFixMessage(): string {
    return (
      `${util.pluralize('required fix', this.issuesRequiredToFix.length, true)} needed, ` +
      `${util.pluralize('optional fix', this.issuesOptionalToFix.length, true)} possible`
    );
  }

  private reportSuccess(): boolean {
    if (this.issuesRequiredToFix.length === 0 && this.issuesOptionalToFix.length === 0) {
      this.log.info('Everything looks good, bye!');
      this.log.info('');
      return true;
    }
    return false;
  }
}
