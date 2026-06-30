import type { AppiumLogger, DoctorCheckResult, IDoctorCheck } from '@appium/types';
import { doctor } from 'appium/support';

export class EnvVarAndPathCheck implements IDoctorCheck {
  log!: AppiumLogger;

  constructor(private readonly varName: string) {}

  async diagnose(): Promise<DoctorCheckResult> {
    return doctor.ok(`${this.varName} environment variable is always set because it's fake`);
  }

  async fix(): Promise<string> {
    return `Make sure the environment variable ${this.varName} is properly configured for the Appium server process`;
  }

  hasAutofix(): boolean {
    return false;
  }

  isOptional(): boolean {
    return false;
  }
}
