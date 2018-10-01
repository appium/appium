import { fs } from 'appium-support';
import { DoctorCheck } from './doctor';
import { ok, nok } from './utils';


// Check env variables
class EnvVarAndPathCheck extends DoctorCheck {
  constructor (varName) {
    super();
    this.varName = varName;
  }

  async diagnose () {
    let varValue = process.env[this.varName];
    if (typeof varValue === 'undefined') {
      return nok(`${this.varName} is NOT set!`);
    }
    return await fs.exists(varValue) ? ok(`${this.varName} is set to: ${varValue}`) :
      nok(`${this.varName} is set to '${varValue}' but this is NOT a valid path!`);
  }

  fix () {
    return `Manually configure ${this.varName}.`;
  }
}


export default EnvVarAndPathCheck;
