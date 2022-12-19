import _ from 'lodash';
import {Doctor} from './doctor';
import generalChecks from './general';
import iosChecks from './ios';
import androidChecks from './android';
import devChecks from './dev';
import demoChecks from './demo';

/**
 * @type {DoctorGroup}
 */
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

/**
 * @typedef {import('./doctor').DoctorCheck[]} DoctorCheckList
 */

/**
 * @typedef DoctorGroup - Contain a group of Doctors
 * @property {DoctorCheckList} generalChecks - Check AppiumHome, NodeBinary, NodeVersion, ffmpeg, mjpeg-consumer
 * @property {DoctorCheckList} iosChecks - Check if iOS toolchains are installed
 * @property {DoctorCheckList} androidChecks - Check if Android toolchains are installed
 * @property {DoctorCheckList} devChecks - Check Path Binary and Android SDKs
 * @property {DoctorCheckList} demoChecks - Check /tmp/appium-doctor/demo/*
 */
