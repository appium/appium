// transpile:mocha

import { EnvVarAndPathCheck, AndroidToolCheck } from '../lib/android';
import { fs } from '../lib/utils';
import chai from 'chai';
import 'mochawait';
import { cloneEnv } from './env-utils.js';
import { withMocks, verifyAll } from './mock-utils';

chai.should();
let P = Promise;

describe('android', () => {
  describe('EnvVarAndPathCheck', withMocks({fs} ,(mocks) => {
    cloneEnv();
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
      verifyAll(mocks);
    });
    it('failure - not set', async () => {
      delete process.env.ANDROID_HOME;
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'ANDROID_HOME is NOT set!'
      });
      verifyAll(mocks);
    });
    it('failure - file not exists', async () => {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(P.resolve(false));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'ANDROID_HOME is set to \'/a/b/c/d\' ' +
          'but this is NOT a valid path!'
      });
      verifyAll(mocks);
    });
    it('fix', async () => {
      (await check.fix()).should.equal('Manually configure ANDROID_HOME.');
    });
  }));
  describe('AndroidToolCheck', withMocks({fs} ,(mocks) => {
    cloneEnv();
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
      verifyAll(mocks);
    });
    it('diagnose - failure - no ANDROID_HOME', async () => {
      delete process.env.ANDROID_HOME;
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'adb could not be found because ANDROID_HOME is NOT set!'
      });
      verifyAll(mocks);
    });
    it('diagnose - failure - path not valid', async () => {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(P.resolve(false));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'adb could NOT be found at \'/a/b/c/d/platform-tools/adb\'!'
      });
      verifyAll(mocks);
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
