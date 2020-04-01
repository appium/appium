// transpile:mocha

import { Doctor, DoctorCheck, FixSkippedError } from '../lib/doctor';
import chai from 'chai';
import { withSandbox, stubLog } from 'appium-test-support';
import log from '../lib/logger';
import B from 'bluebird';


chai.should();

describe('doctor', function () {
  it('register', function () {
    let doctor = new Doctor();
    doctor.checks.should.have.length(0);
    doctor.register(new DoctorCheck());
    doctor.checks.should.have.length(1);
    doctor.register([new DoctorCheck(), new DoctorCheck()]);
    doctor.checks.should.have.length(3);
  });

  function configure () {
    let doctor = new Doctor();
    let checks = [new DoctorCheck(), new DoctorCheck(), new DoctorCheck(), new DoctorCheck(), new DoctorCheck()];
    doctor.register(checks);
    return {doctor, checks};
  }

  describe('diagnose', withSandbox({}, (S) => {
    it('should detect all issues', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      let {doctor, checks} = configure();
      S.mocks.checks = checks.map((check) => S.sandbox.mock(check));
      S.mocks.checks[0].expects('diagnose').once().returns({ok: true, message: 'All Good!'});
      S.mocks.checks[1].expects('diagnose').twice().returns({ok: true, optional: true, message: 'All Good Option!'});
      S.mocks.checks[2].expects('diagnose').once().returns({ok: false, message: 'Oh No!'});
      S.mocks.checks[3].expects('diagnose').twice().returns({ok: false, optional: true, message: 'Oh No Option!'});
      S.mocks.checks[4].expects('diagnose').once().returns({ok: false, message: 'Oh No!'});
      await doctor.diagnose();
      S.verify();
      doctor.toFix.should.have.length(2);
      doctor.toFixOptionals.should.have.length(1);
      logStub.output.should.equal([
        'info: ### Diagnostic for necessary dependencies starting ###',
        'info:  ✔ All Good!',
        'warn:  ✖ Oh No!',
        'warn:  ✖ Oh No!',
        'info: ### Diagnostic for necessary dependencies completed, 2 fixes needed. ###',
        'info: ',
        'info: ### Diagnostic for optional dependencies starting ###',
        'info:  ✔ All Good Option!',
        'warn:  ✖ Oh No Option!',
        'info: ### Diagnostic for optional dependencies completed, one fix possible. ###',
        'info: ',
      ].join('\n'));
    });
  }));

  describe('reportSuccess', withSandbox({}, (S) => {
    let doctor = new Doctor();
    it('should report success when no fixes are needed', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      (await doctor.reportSuccess(doctor.toFix.length, doctor.toFixOptionals.length)).should.equal(true);
      logStub.output.should.equal([
        'info: Everything looks good, bye!',
        'info: '
      ].join('\n'));
    });

    it('should return false when fixes are needed', async function () {
      doctor.toFix = [{}];
      (await doctor.reportSuccess(doctor.toFix.length)).should.equal(false);
    });
  }));

  describe('reportManualFixes', withSandbox({}, (S) => {
    let doctor = new Doctor();
    it('should ask for manual fixes to be applied', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      doctor.toFix = [
        {error: 'Oh no this need to be manually fixed.', check: new DoctorCheck()},
        {error: 'Oh no this is an autofix.', check: new DoctorCheck({autofix: true})},
        {error: 'Oh no this also need to be manually fixed.', check: new DoctorCheck()},
        {error: 'Oh no this also need to be manually fixed.', check: new DoctorCheck()},
      ];
      doctor.toFixOptionals = [];
      for (let i = 0; i < doctor.toFix.length; i++) {
        let m = S.sandbox.mock(doctor.toFix[i].check);
        if (doctor.toFix[i].check.autofix) {
          m.expects('fix').never();
        } else {
          m.expects('fix').once().returns(B.resolve(`Manual fix for ${i} is do something.`));
        }
      }
      (await doctor.reportManualFixes(doctor.toFix, doctor.toFixOptionals)).should.equal(true);
      S.verify();
      logStub.output.should.equal([
        'info: ### Manual Fixes Needed ###',
        'info: The configuration cannot be automatically fixed, please do the following first:',
        'warn:  ➜ Manual fix for 0 is do something.',
        'warn:  ➜ Manual fix for 2 is do something.',
        'warn:  ➜ Manual fix for 3 is do something.',
        'info: ',
        'info: ###',
        'info: ',
        'info: Bye! Run appium-doctor again when all manual fixes have been applied!',
        'info: '
      ].join('\n'));
    });

    it('should ask for manual fixes to be applied for optional', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      doctor.toFix = [];
      doctor.toFixOptionals = [
        {error: 'Oh no this need to be manually fixed.', check: new DoctorCheck()},
        {error: 'Oh no this also need to be manually fixed.', check: new DoctorCheck()},
      ];
      for (let i = 0; i < doctor.toFixOptionals.length; i++) {
        let m = S.sandbox.mock(doctor.toFixOptionals[i].check);
        if (doctor.toFixOptionals[i].check.autofix) {
          m.expects('fix').never();
        } else {
          m.expects('fix').once().returns(B.resolve(`Manual fix for ${i} is do something.`));
        }
      }
      (await doctor.reportManualFixes(doctor.toFix, doctor.toFixOptionals)).should.equal(true);
      S.verify();
      logStub.output.should.equal([
        'info: ### Optional Manual Fixes ###',
        'info: The configuration can install optionally. Please do the following manually:',
        'warn:  ➜ Manual fix for 0 is do something.',
        'warn:  ➜ Manual fix for 1 is do something.',
        'info: ',
        'info: ###',
        'info: ',
        'info: Bye! Run appium-doctor again when all manual fixes have been applied!',
        'info: '
      ].join('\n'));
    });

    it('should ask for manual fixes to be applied for necessary and optional', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      doctor.toFix = [
        {error: 'Oh no this need to be manually fixed.', check: new DoctorCheck()}
      ];
      doctor.toFixOptionals = [
        {error: 'Oh no this need to be manually fixed, but it is optional.', check: new DoctorCheck()},
      ];

      S.sandbox.mock(doctor.toFix[0].check).expects('fix').once().returns(B.resolve(`Manual fix for 0 is do something.`));
      S.sandbox.mock(doctor.toFixOptionals[0].check).expects('fix').once().returns(B.resolve(`Manual fix for 0 is do something.`));

      (await doctor.reportManualFixes(doctor.toFix, doctor.toFixOptionals)).should.equal(true);
      S.verify();
      logStub.output.should.equal([
        'info: ### Manual Fixes Needed ###',
        'info: The configuration cannot be automatically fixed, please do the following first:',
        'warn:  ➜ Manual fix for 0 is do something.',
        'info: ',
        'info: ### Optional Manual Fixes ###',
        'info: The configuration can install optionally. Please do the following manually:',
        'warn:  ➜ Manual fix for 0 is do something.',
        'info: ',
        'info: ###',
        'info: ',
        'info: Bye! Run appium-doctor again when all manual fixes have been applied!',
        'info: '
      ].join('\n'));
    });

    it('should return false when there is no manual fix', async function () {
      doctor.toFix = [{error: 'Oh no!', check: new DoctorCheck({autofix: true}) }];
      (await doctor.reportManualFixes()).should.equal(false);
    });
  }));

  describe('runAutoFix', withSandbox({}, (S) => {
    let doctor = new Doctor();
    let fix = {
      error: 'Something wrong!',
      check: {
        fix () {},
        diagnose () {}
      }
    };

    it('fix - success', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      S.mocks.check = S.sandbox.mock(fix.check);
      S.mocks.check.expects('fix').once();
      S.mocks.check.expects('diagnose').once().returns(B.resolve({
        ok: true,
        optional: false,
        message: 'It worked'
      }));
      await doctor.runAutoFix(fix);
      S.verify();
      logStub.output.should.equal([
        'info: ### Fixing: Something wrong! ###',
        'info: Checking if this was fixed:',
        'info:  ✔ It worked',
        'info: ### Fix was successfully applied ###'
      ].join('\n'));
    });

    it('fix - skipped', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      S.mocks.check = S.sandbox.mock(fix.check);
      S.mocks.check.expects('fix').once().throws(new FixSkippedError());
      await doctor.runAutoFix(fix);
      S.verify();
      logStub.output.should.equal([
        'info: ### Fixing: Something wrong! ###',
        'info: ### Skipped fix ###',
      ].join('\n'));
    });

    it('fix - crash', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      S.mocks.check = S.sandbox.mock(fix.check);
      S.mocks.check.expects('fix').once().throws(new Error('Oh No!'));
      await doctor.runAutoFix(fix);
      S.verify();
      logStub.output.should.equal([
        'info: ### Fixing: Something wrong! ###',
        'warn: Error: Oh No!',
        'info: ### Fix did not succeed ###',
      ].join('\n'));
    });

    it('fix - didn\'t fix', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      S.mocks.check = S.sandbox.mock(fix.check);
      S.mocks.check.expects('fix').once();
      S.mocks.check.expects('diagnose').once().returns(B.resolve({
        ok: false, message: 'Still Weird!'}));
      await doctor.runAutoFix(fix);
      S.verify();
      logStub.output.should.equal([
        'info: ### Fixing: Something wrong! ###',
        'info: Checking if this was fixed:',
        'info:  ✖ Still Weird!',
        'info: ### Fix was applied but issue remains ###'
      ].join('\n'));
    });
  }));

  describe('runAutoFixes', withSandbox({}, (S) => {
    let doctor = new Doctor();
    it('success', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      doctor.toFix = [
        {error: 'Oh no.', check: new DoctorCheck({autofix: true})},
        {error: 'Oh no.', check: new DoctorCheck({autofix: true})},
        {error: 'Oh no.', check: new DoctorCheck({autofix: true})},
      ];
      S.sandbox.stub(doctor, 'runAutoFix').callsFake((f) => {
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

    it('failure', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      doctor.toFix = [
        {error: 'Oh no.', check: new DoctorCheck({autofix: true})},
        {error: 'Oh no.', check: new DoctorCheck({autofix: true})},
        {error: 'Oh no.', check: new DoctorCheck({autofix: true})},
      ];
      let succeed = false;
      S.sandbox.stub(doctor, 'runAutoFix').callsFake((f) => {
        if (succeed) {
          log.info('succeeded, Autofix log go there.');
          f.fixed = true;
        } else {
          log.warn('failed, Autofix log go there.');
        }
        succeed = !succeed;
      });
      await doctor.runAutoFixes();
      doctor.runAutoFix.calledThrice.should.be.ok;
      logStub.output.should.equal([
        'warn: failed, Autofix log go there.',
        'info: ',
        'info: succeeded, Autofix log go there.',
        'info: ',
        'warn: failed, Autofix log go there.',
        'info: ',
        'info: Bye! A few issues remain, fix manually and/or rerun appium-doctor!',
        'info: ',
      ].join('\n'));
    });
  }));

  describe('run', withSandbox({}, (S) => {
    let doctor = new Doctor();
    it('should work', async function () {
      try {
        let doctor = new Doctor();
        await doctor.run();
      } catch (err) {
      }
    });
    it('should report success', async function () {
      S.mocks.doctor = S.sandbox.mock(doctor);
      S.mocks.doctor.expects('diagnose').once();
      S.mocks.doctor.expects('reportSuccess').once().returns(true);
      S.mocks.doctor.expects('reportManualFixes').never();
      S.mocks.doctor.expects('runAutoFixes').never();
      await doctor.run();
      S.verify();
    });
    it('should report manual fixes', async function () {
      S.mocks.doctor = S.sandbox.mock(doctor);
      S.mocks.doctor.expects('diagnose').once();
      S.mocks.doctor.expects('reportSuccess').once().returns(false);
      S.mocks.doctor.expects('reportManualFixes').once().returns(true);
      S.mocks.doctor.expects('runAutoFixes').never();
      await doctor.run();
      S.verify();
    });
    it('should run autofixes', async function () {
      S.mocks.doctor = S.sandbox.mock(doctor);
      S.mocks.doctor.expects('diagnose').once();
      S.mocks.doctor.expects('reportSuccess').once().returns(false);
      S.mocks.doctor.expects('reportManualFixes').once().returns(false);
      S.mocks.doctor.expects('runAutoFixes').once();
      await doctor.run();
      S.verify();
    });
  }));
});
