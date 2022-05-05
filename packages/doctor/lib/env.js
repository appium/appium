import {fs} from '@appium/support';
import {DoctorCheck} from './doctor';
import {ok, nok} from './utils';
import '@colors/colors';

// Check env variables
class EnvVarAndPathCheck extends DoctorCheck {
  constructor(varName) {
    super();
    this.varName = varName;
  }

  async diagnose() {
    let varValue = process.env[this.varName];
    if (typeof varValue === 'undefined') {
      return nok(`${this.varName} environment variable is NOT set!`);
    }
    return (await fs.exists(varValue))
      ? ok(`${this.varName} is set to: ${varValue}`)
      : nok(`${this.varName} is set to '${varValue}' but this is NOT a valid path!`);
  }

  fix() {
    return (
      `Make sure the environment variable ${this.varName.bold} is properly configured for the Appium process. ` +
      `Refer https://github.com/appium/java-client/blob/master/docs/environment.md for more details.`
    );
  }
}

export default EnvVarAndPathCheck;
