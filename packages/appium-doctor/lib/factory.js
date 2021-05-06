import _ from 'lodash';
import { Doctor } from './doctor';
import generalChecks from './general';
import iosChecks from './ios';
import androidChecks from './android';
import devChecks from './dev';
import demoChecks from './demo';


let checks = {generalChecks, iosChecks, androidChecks, devChecks, demoChecks};

let newDoctor = (opts) => {
  let doctor = new Doctor();
  for (let [k, v] of _.toPairs(opts)) {
    if (v) {
      doctor.register(checks[`${k}Checks`] || []);
    }
  }
  return doctor;
};

export default newDoctor;
