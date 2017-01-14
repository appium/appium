// transpile:mocha

import { EnvVarAndPathCheck, AndroidToolCheck } from '../lib/android';
import { fs } from 'appium-support';
import chai from 'chai';
import { withMocks, verify, stubEnv } from 'appium-test-support';

chai.should();
let P = Promise;

describe('android', () => {
  describe('EnvVarAndPathCheck', withMocks({fs}, (mocks) => {
    stubEnv();
    let check = new EnvVarAndPathCheck('ANDROID_HOME');
    it('autofix', () => {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async () => {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(P.resolve(true));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        message: 'ANDROID_HOME is set to: /a/b/c/d'
      });
      verify(mocks);
    });
    it('failure - not set', async () => {
      delete process.env.ANDROID_HOME;
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'ANDROID_HOME is NOT set!'
      });
      verify(mocks);
    });
    it('failure - file not exists', async () => {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(P.resolve(false));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'ANDROID_HOME is set to \'/a/b/c/d\' ' +
          'but this is NOT a valid path!'
      });
      verify(mocks);
    });
    it('fix', async () => {
      (await check.fix()).should.equal('Manually configure ANDROID_HOME.');
    });
  }));
  describe('AndroidToolCheck', withMocks({fs}, (mocks) => {
    stubEnv();
    let check = new AndroidToolCheck('adb', 'platform-tools/adb');
    it('autofix', () => {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async () => {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(P.resolve(true));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        message: 'adb exists at: /a/b/c/d/platform-tools/adb'
      });
      verify(mocks);
    });
    it('diagnose - failure - no ANDROID_HOME', async () => {
      delete process.env.ANDROID_HOME;
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'adb could not be found because ANDROID_HOME is NOT set!'
      });
      verify(mocks);
    });
    it('diagnose - failure - path not valid', async () => {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(P.resolve(false));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'adb could NOT be found at \'/a/b/c/d/platform-tools/adb\'!'
      });
      verify(mocks);
    });
    it('fix - ANDROID_HOME', async () => {
      delete process.env.ANDROID_HOME;
      (await check.fix()).should.equal('Manually configure ANDROID_HOME ' +
        'and run appium-doctor again.');
    });
    it('fix - install', async () => {
      process.env.ANDROID_HOME = '/a/b/c/d';
      (await check.fix()).should.equal('Manually install adb and add it to PATH.');
    });
  }));
});
