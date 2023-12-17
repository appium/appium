/* eslint-disable @typescript-eslint/no-var-requires */
const {fs, system} = require('@appium/support');

/**
 * @param {string} message
 * @returns {CheckResult}
 */
function ok(message) {
  return {ok: true, optional: false, message};
}

/**
 * @param {string} message
 * @returns {CheckResult}
 */
function nok(message) {
  return {ok: false, optional: false, message};
}

/** @satisfies {import('@appium/types').IDoctorCheck} */
export class EnvVarAndPathCheck {
  /**
   * @param {string} varName
   */
  constructor(varName) {
    this.varName = varName;
  }

  async diagnose() {
    const varValue = process.env[this.varName];
    if (typeof varValue === 'undefined') {
      return nok(`${this.varName} environment variable is NOT set!`);
    }

    if (await fs.exists(varValue)) {
      return ok(`${this.varName} is set to: ${varValue}`);
    }

    return nok(`${this.varName} is set to '${varValue}' but this is NOT a valid path!`);
  }

  async fix() {
    return (
      `Make sure the environment variable ${this.varName} is properly configured for the Appium server process`
    );
  }
}

module.exports = {ok, nok, EnvVarAndPathCheck};

/**
 * @typedef {import('@appium/types').DoctorCheckResult} CheckResult
 */
