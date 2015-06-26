// transpile:mocha

import { newDoctor, Doctor, DoctorCheck } from '../index';
import chai from 'chai';
import 'mochawait';

chai.should();

describe('index', () => {
  it('should work', () => {
    newDoctor.should.exists;
    Doctor.should.exists;
    DoctorCheck.should.exists;
  });
});
