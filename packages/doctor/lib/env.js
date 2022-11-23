import {fs, system} from '@appium/support';
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

    if (await fs.exists(varValue)) {
      return ok(`${this.varName} is set to: ${varValue}`);
    }

    let err_msg = `${this.varName} is set to '${varValue}' but this is NOT a valid path!`;
    // On Windows, when the env var has %LOCALAPPDATA%, fs.exists cannot resolve the path.
    // Then, it would be safe to request the user to set the full path instead.
    if (system.isWindows() && varValue.includes('%LOCALAPPDATA%')) {
      err_msg += ` Please set '${process.env.LOCALAPPDATA}' instead of '%LOCALAPPDATA%' as the environment variable.`;
    }
    return nok(err_msg);
  }

  fix() {
    return (
      `Make sure the environment variable ${this.varName.bold} is properly configured for the Appium process. ` +
      `Refer https://github.com/appium/java-client/blob/master/docs/environment.md for more details.`
    );
  }
}

export default EnvVarAndPathCheck;
