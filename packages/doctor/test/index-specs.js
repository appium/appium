// transpile:mocha

import { newDoctor, Doctor, DoctorCheck } from '../index';
import chai from 'chai';

chai.should();

describe('index', function () {
  it('should work', function () {
    newDoctor.should.exist;
    Doctor.should.exist;
    DoctorCheck.should.exist;
  });
});
