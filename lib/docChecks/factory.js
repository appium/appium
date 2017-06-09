import _  from 'lodash';
import { Doctor } from './doctor';
import generalChecks from './general';
import iosChecks from './ios';
import androidChecks from './android';
import devChecks from './dev';


let checks = {generalChecks, iosChecks, androidChecks, devChecks};

let newDoctor = (opts) => {
  console.log("opts: ", opts); // eslint-disable-line no-console
  let doctor = new Doctor();
  for (let [k, v] of _.toPairs(opts)) {
    console.log(`k:${k}-v:${v}`); // eslint-disable-line no-console
    if (v) {
      doctor.register(checks[`${k}Checks`] || []);
    }
  }
  return doctor;
};

export default newDoctor;
