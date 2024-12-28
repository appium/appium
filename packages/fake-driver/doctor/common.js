
const {doctor} = require('appium/support');

/** @satisfies {import('@appium/types').IDoctorCheck} */
class EnvVarAndPathCheck {
  /**
   * @param {string} varName
   */
  constructor(varName) {
    this.varName = varName;
  }

  async diagnose() {
    return doctor.ok(`${this.varName} environment variable is always set because it's fake`);
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
