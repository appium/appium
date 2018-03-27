// transpile:mocha

import { newDoctor, Doctor, DoctorCheck } from '../index';
import chai from 'chai';

chai.should();

describe('index', function () {
  it('should work', function () {
    newDoctor.should.exists;
    Doctor.should.exists;
    DoctorCheck.should.exists;
  });
});
