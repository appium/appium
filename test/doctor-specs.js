// transpile:mocha

import { Doctor, DoctorCheck, FixSkippedError } from '../lib/docChecks/doctor';
import chai from 'chai';
import { withSandbox, withMocks, verify, stubLog } from 'appium-test-support';
import log from '../lib/logger';

chai.should();
let P = Promise; // eslint-disable-line

describe('doctor', () => {

  it('register', () => {
    let doctor = new Doctor();
    doctor.checks.should.have.length(0);
    doctor.register(new DoctorCheck());
    doctor.checks.should.have.length(1);
    doctor.register([new DoctorCheck(), new DoctorCheck()]);
    doctor.checks.should.have.length(3);
  });

  function configure () {
    let doctor = new Doctor();
    let checks = [new DoctorCheck(), new DoctorCheck(), new DoctorCheck()];
    doctor.register(checks);
    return {doctor, checks};
  }
  
  describe('diagnose', withMocks({}, (mocks, S) => {
    it('should detect all issues', async () => {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      let {doctor, checks} = configure();
      mocks.checks = checks.map((check) => { return S.sandbox.mock(check); });
      mocks.checks[0].expects('diagnose').once().returns({ok: true, message: "All Good!"});
      mocks.checks[1].expects('diagnose').once().returns({ok: false, message: "Oh No!"});
      mocks.checks[2].expects('diagnose').once().returns({ok: false, message: "Oh No!"});
      await doctor.diagnose();
      verify(mocks);
      doctor.toFix.should.have.length(2);
      logStub.output.should.equal([
        'info: ### Diagnostic starting ###',
        'info:  ✔ All Good!',
        'warn:  ✖ Oh No!',
        'warn:  ✖ Oh No!',
        'info: ### Diagnostic completed, 2 fixes needed. ###',
        'info: '
      ].join('\n'));
    });
  }));

  
  describe('reportSuccess', withMocks({}, (mocks, S) => {
    let doctor = new Doctor();
    it('should report success when no fixes are needed', async () => {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      doctor.toFix = [];
      (await doctor.reportSuccess()).should.equal(true);
      logStub.output.should.equal([
        'info: Everything looks good, bye!',
        'info: '
      ].join('\n'));
    });

    it('should return false when fixes are needed', async () => {
      doctor.toFix = [{}];
      (await doctor.reportSuccess()).should.equal(false);
    });
  }));

  describe('reportManualFixes', withMocks({}, (mocks, S) => {
    let doctor = new Doctor();
    it('should ask for manual fixes to be applied', async () => {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      doctor.toFix = [
        {error: 'Oh no this need to be manually fixed.', check: new DoctorCheck()},
        {error: 'Oh no this is an autofix.', check: new DoctorCheck({autofix: true})},
        {error: 'Oh no this also need to be manually fixed.', check: new DoctorCheck()},
        {error: 'Oh no this also need to be manually fixed.', check: new DoctorCheck()},
      ];
      for (let i=0; i<doctor.toFix.length; i++) {
        let m = S.sandbox.mock(doctor.toFix[i].check);
        if (doctor.toFix[i].check.autofix) {
          m.expects('fix').never();
        } else {
          m.expects('fix').once().returns(P.resolve(`Manual fix for ${i} is do something.`));
        }
      }
      (await doctor.reportManualFixes()).should.equal(true);
      verify(mocks);
      logStub.output.should.equal([
        'info: ### Manual Fixes Needed ###',
        'info: The configuration cannot be automatically fixed, please do the following first:',
        'warn: - Manual fix for 0 is do something.',
        'warn: - Manual fix for 2 is do something.',
        'warn: - Manual fix for 3 is do something.',
        'info: ###',
        'info: ',
        'info: '
      ].join('\n'));
    });

    it('should return false when there is no manual fix', async () => {
      doctor.toFix = [{error: 'Oh no!', check: new DoctorCheck({autofix: true}) }];
      (await doctor.reportManualFixes()).should.equal(false);
    });
  }));

  describe('runAutoFix',  withMocks({}, (mocks, S) => {
    let doctor = new Doctor();
    let fix = {
      error: 'Something wrong!',
      check: {
        fix: () => {},
        diagnose: () => {}
      }
    };

    it('fix - success', async () => {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      mocks.check = S.sandbox.mock(fix.check);
      mocks.check.expects('fix').once();
      mocks.check.expects('diagnose').once().returns(P.resolve({
        ok: true, message: 'It worked'}));
      await doctor.runAutoFix(fix);
      verify(mocks);
      logStub.output.should.equal([
        'info: ### Fixing: Something wrong! ###',
        'info: Checking if this was fixed:',
        'info:  ✔ It worked',
        'info: ### Fix was successfully applied ###'
      ].join('\n'));
    });

    it('fix - skipped', async () => {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      mocks.check = S.sandbox.mock(fix.check);
      mocks.check.expects('fix').once().throws(new FixSkippedError());
      await doctor.runAutoFix(fix);
      verify(mocks);
      logStub.output.should.equal([
        'info: ### Fixing: Something wrong! ###',
        'info: ### Skipped fix ###',
      ].join('\n'));
    });

    it('fix - crash', async () => {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      mocks.check = S.sandbox.mock(fix.check);
      mocks.check.expects('fix').once().throws(new Error('Oh No!'));
      await doctor.runAutoFix(fix);
      verify(mocks);
      logStub.output.should.equal([
        'info: ### Fixing: Something wrong! ###',
        'warn: Error: Oh No!',
        'info: ### Fix did not succeed ###',
      ].join('\n'));
    });

    it('fix - didn\'t fix', async () => {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      mocks.check = S.sandbox.mock(fix.check);
      mocks.check.expects('fix').once();
      mocks.check.expects('diagnose').once().returns(P.resolve({
        ok: false, message: 'Still Weird!'}));
      await doctor.runAutoFix(fix);
      verify(mocks);
      logStub.output.should.equal([
        'info: ### Fixing: Something wrong! ###',
        'info: Checking if this was fixed:',
        'info:  ✖ Still Weird!',
        'info: ### Fix was applied but issue remains ###'
      ].join('\n'));
    });
  }));

  describe('runAutoFixes',  withSandbox({}, (S) => {
    let doctor = new Doctor();
    it('success', async () => {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      doctor.toFix = [
        {error: 'Oh no.', check: new DoctorCheck({autofix: true})},
        {error: 'Oh no.', check: new DoctorCheck({autofix: true})},
        {error: 'Oh no.', check: new DoctorCheck({autofix: true})},
      ];
      S.sandbox.stub(doctor, 'runAutoFix', (f) => {
        log.info('Autofix log go there.');
        f.fixed = true;
      });
      await doctor.runAutoFixes();
      doctor.runAutoFix.calledThrice.should.be.ok;
      logStub.output.should.equal([
        'info: Autofix log go there.',
        'info: ',
        'info: Autofix log go there.',
        'info: ',
        'info: Autofix log go there.',
        'info: ',
        'info: Bye! All issues have been fixed!',
        'info: ',
      ].join('\n'));
    });
    
    it('failure', async () => {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      doctor.toFix = [
        {error: 'Oh no.', check: new DoctorCheck({autofix: true})},
        {error: 'Oh no.', check: new DoctorCheck({autofix: true})},
        {error: 'Oh no.', check: new DoctorCheck({autofix: true})},
      ];
      let succeed = false;
      S.sandbox.stub(doctor, 'runAutoFix', (f) => {
        if (succeed) {
          log.info('succeeded, Autofix log go there.');
          f.fixed = true;
        } else {
          log.warn('failed, Autofix log go there.');
        }
        succeed = !succeed;
      });
      try {
        await doctor.runAutoFixes();
        doctor.runAutoFix.calledThrice.should.be.ok;
        logStub.output.should.equal([
          'warn: failed, Autofix log go there.',
          'info: ',
          'info: succeeded, Autofix log go there.',
          'info: ',
          'warn: failed, Autofix log go there.',
          'info: ',
          'info: ',
        ].join('\n'));
      } catch (err) {}  
    });
  }));
  
  describe('run',  withMocks({}, (mocks, S) => {
    let doctor = new Doctor();
    it('should work', async () => {
      try {
        let doctor = new Doctor();
        await doctor.run();
      } catch (err) {
      }
    });
    it('should report success', async () => {
      mocks.doctor = S.sandbox.mock(doctor);
      mocks.doctor.expects('diagnose').once();
      mocks.doctor.expects('reportSuccess').once().returns(true);
      mocks.doctor.expects('reportManualFixes').never();
      mocks.doctor.expects('runAutoFixes').never();
      await doctor.run();
      verify(mocks);
    });
    it('should report manual fixes', async () => {
      mocks.doctor = S.sandbox.mock(doctor);
      mocks.doctor.expects('diagnose').once();
      mocks.doctor.expects('reportSuccess').once().returns(false);
      mocks.doctor.expects('reportManualFixes').once().returns(true);
      mocks.doctor.expects('runAutoFixes').never();
      try {
        await doctor.run();
      } catch (err) {

      }
      verify(mocks);
    });
    it('should run autofixes', async () => {
      mocks.doctor = S.sandbox.mock(doctor);
      mocks.doctor.expects('diagnose').once();
      mocks.doctor.expects('reportSuccess').once().returns(false);
      mocks.doctor.expects('reportManualFixes').once().returns(false);
      mocks.doctor.expects('runAutoFixes').once();
      try {
        await doctor.run();
      } catch (err) {
        
      }
      verify(mocks);
    });
  }));
});
