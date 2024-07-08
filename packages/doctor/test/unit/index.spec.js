import {newDoctor, Doctor, DoctorCheck} from '../../lib';

describe('index', function () {
  before(async function () {
    const chai = await import('chai');
    chai.should();
  });

  it('should work', function () {
    newDoctor.should.exist;
    Doctor.should.exist;
    DoctorCheck.should.exist;
  });
});
