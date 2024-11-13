import newDoctor from '../../lib/factory';

describe('factory', function () {
  before(async function () {
    const chai = await import('chai');
    chai.should();
  });

  function getTest(config) {
    return function runTest() {
      let doctor = newDoctor(config);
      doctor.should.exist;
      doctor.checks.should.have.length.above(0);
    };
  }
  for (let config of [{ios: true}, {android: true}, {dev: true}]) {
    it(`should work for ${config}`, getTest(config));
  }
});
