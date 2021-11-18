// transpile:mocha

import { newDoctor, Doctor, DoctorCheck } from '../lib';


describe('index', function () {
  it('should work', function () {
    newDoctor.should.exist;
    Doctor.should.exist;
    DoctorCheck.should.exist;
  });
});
