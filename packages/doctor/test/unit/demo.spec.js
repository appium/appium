import {DirCheck, FileCheck} from '../../lib/demo';
import {fs} from '@appium/support';
import * as tp from 'teen_process';
import * as prompt from '../../lib/prompt';
import log from '../../lib/logger';
import {FixSkippedError} from '../../lib/doctor';
import {withMocks, withSandbox, stubLog} from '@appium/test-support';
import B from 'bluebird';

describe('demo', function () {
  describe(
    'DirCheck',
    withMocks({fs}, (mocks) => {
      let check = new DirCheck('/a/b/c/d');

      it('diagnose - success', async function () {
        mocks.fs.expects('exists').once().returns(B.resolve(true));
        mocks.fs
          .expects('lstat')
          .once()
          .returns(
            B.resolve({
              isDirectory() {
                return true;
              },
            })
          );
        (await check.diagnose()).should.deep.equal({
          ok: true,
          optional: false,
          message: 'Found directory at: /a/b/c/d',
        });
        mocks.verify();
      });

      it('failure - not there', async function () {
        mocks.fs.expects('exists').once().returns(B.resolve(false));
        (await check.diagnose()).should.deep.equal({
          ok: false,
          optional: false,
          message: "Could NOT find directory at '/a/b/c/d'!",
        });
        mocks.verify();
      });

      it('failure - not a dir', async function () {
        mocks.fs.expects('exists').once().returns(B.resolve(true));
        mocks.fs
          .expects('lstat')
          .once()
          .returns(
            B.resolve({
              isDirectory() {
                return false;
              },
            })
          );
        (await check.diagnose()).should.deep.equal({
          ok: false,
          optional: false,
          message: "'/a/b/c/d' is NOT a directory!",
        });
        mocks.verify();
      });

      it('fix', async function () {
        (await check.fix()).should.equal(
          'Manually create a directory at: /a/b/c/d'
        );
      });
    })
  );

  describe(
    'FileCheck',
    withSandbox({mocks: {fs, tp, prompt}}, (S) => {
      let check = new FileCheck('/a/b/c/d');

      it('diagnose - success', async function () {
        S.mocks.fs.expects('exists').once().returns(B.resolve(true));
        (await check.diagnose()).should.deep.equal({
          ok: true,
          optional: false,
          message: 'Found file at: /a/b/c/d',
        });
        S.verify();
      });

      it('failure - not there', async function () {
        S.mocks.fs.expects('exists').once().returns(B.resolve(false));
        (await check.diagnose()).should.deep.equal({
          ok: false,
          optional: false,
          message: "Could NOT find file at '/a/b/c/d'!",
        });
        S.verify();
      });

      it('fix - yes', async function () {
        let logStub = stubLog(S.sandbox, log, {stripColors: true});
        S.mocks.prompt.expects('fixIt').once().returns(B.resolve('yes'));
        S.mocks.tp
          .expects('exec')
          .once()
          .returns(B.resolve({stdout: '', stderr: ''}));
        await check.fix();
        S.verify();
        logStub.output.should.equal(
          "info: The following command need be executed: touch '/a/b/c/d'"
        );
      });

      it('fix - no', async function () {
        let logStub = stubLog(S.sandbox, log, {stripColors: true});
        S.mocks.prompt.expects('fixIt').once().returns(B.resolve('no'));
        S.mocks.tp.expects('exec').never();
        await check.fix().should.be.rejectedWith(FixSkippedError);
        S.verify();
        logStub.output.should.equal(
          [
            "info: The following command need be executed: touch '/a/b/c/d'",
            "info: Skipping you will need to touch '/a/b/c/d' manually.",
          ].join('\n')
        );
      });
    })
  );
});
