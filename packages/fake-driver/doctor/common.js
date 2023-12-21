/* eslint-disable @typescript-eslint/no-var-requires */
const {fs, doctor} = require('@appium/support');

/** @satisfies {import('@appium/types').IDoctorCheck} */
class EnvVarAndPathCheck {
  /**
   * @param {string} varName
   */
  constructor(varName) {
    this.varName = varName;
  }

  async diagnose() {
    const varValue = process.env[this.varName];
    if (typeof varValue === 'undefined') {
      return doctor.nok(`${this.varName} environment variable is NOT set!`);
    }

    if (await fs.exists(varValue)) {
      return doctor.ok(`${this.varName} is set to: ${varValue}`);
    }

    return doctor.nok(`${this.varName} is set to '${varValue}' but this is NOT a valid path!`);
  }

  async fix() {
    return (
      `Make sure the environment variable ${this.varName} is properly configured for the Appium server process`
    );
  }

  hasAutofix() {
    return false;
  }

  isOptional() {
    return false;
  }
}

module.exports = {EnvVarAndPathCheck};

/**
 * @typedef {import('@appium/types').DoctorCheckResult} CheckResult
 */
