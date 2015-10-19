// transpile:mocha

import { BinaryIsInPathCheck, AndroidSdkExists } from '../lib/dev';
import { fs } from 'appium-support';
import * as tp from 'teen_process';
import chai from 'chai';
import 'mochawait';
import { withMocks, verify, stubEnv } from 'appium-test-support';

chai.should();
let P = Promise;

describe('dev', () => {
  describe('BinaryIsInPathCheck', withMocks({tp, fs} ,(mocks) => {
    stubEnv();
    let check = new BinaryIsInPathCheck('mvn');
    it('autofix', () => {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async () => {
      process.env.PATH = '/a/b/c/d;/e/f/g/h';
      mocks.tp.expects('exec').once().returns(
        P.resolve({stdout: '/a/b/c/d/mvn\n', stderr: ''}));
      mocks.fs.expects('exists').once().returns(P.resolve(true));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        message: 'mvn was found at /a/b/c/d/mvn'
      });
      verify(mocks);
    });
    it('diagnose - failure - not in path ', async () => {
      process.env.PATH = '/a/b/c/d;/e/f/g/h';
      mocks.tp.expects('exec').once().returns(
        P.resolve({stdout: 'mvn not found\n', stderr:''}));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'mvn is MISSING in PATH!'
      });
      verify(mocks);
    });
    it('diagnose - failure - invalid path', async () => {
      process.env.PATH = '/a/b/c/d;/e/f/g/h';
      mocks.tp.expects('exec').once().returns(
        P.resolve({stdout: '/a/b/c/d/mvn\n', stderr: ''}));
      mocks.fs.expects('exists').once().returns(P.resolve(false));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'mvn was found in PATH at \'/a/b/c/d/mvn\', ' +
          'but this is NOT a valid path!'
      });
      verify(mocks);
    });
    it('fix', async () => {
      (await check.fix()).should.equal('Manually install the mvn binary and add it to PATH.');
    });
  }));
  describe('AndroidSdkExists', withMocks({fs} ,(mocks) => {
    stubEnv();
    let check = new AndroidSdkExists('android-16');
    it('autofix', () => {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async () => {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(P.resolve(true));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        message: 'android-16 was found at: /a/b/c/d/platforms/android-16'
      });
      verify(mocks);
    });
    it('failure - missing android home', async () => {
      delete process.env.ANDROID_HOME;
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'android-16 could not be found because ANDROID_HOME is NOT set!'
      });
      verify(mocks);
    });
    it('diagnose - failure - invalid path', async () => {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(P.resolve(false));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'android-16 could NOT be found at \'/a/b/c/d/platforms/android-16\'!'
      });
      verify(mocks);
    });
    it('fix - ANDROID_HOME', async () => {
      delete process.env.ANDROID_HOME;
      (await check.fix()).should.equal('Manually configure ANDROID_HOME.');
    });
    it('fix - install', async () => {
      process.env.ANDROID_HOME = '/a/b/c/d';
      (await check.fix()).should.equal('Manually install the android-16 sdk.');
    });
  }));
});
