// transpile:mocha

import { BinaryIsInPathCheck, AndroidSdkExists } from '../lib/dev';
import { fs } from 'appium-support';
import * as tp from 'teen_process';
import chai from 'chai';
import { withMocks, stubEnv } from '@appium/test-support';
import B from 'bluebird';
import { removeColors } from './helper';

chai.should();

describe('dev', function () {
  describe('BinaryIsInPathCheck', withMocks({tp, fs}, (mocks) => {
    stubEnv();
    let check = new BinaryIsInPathCheck('mvn');
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      process.env.PATH = '/a/b/c/d;/e/f/g/h';
      mocks.fs.expects('which').once().returns(B.resolve('/a/b/c/d/mvn'));
      mocks.fs.expects('exists').once().returns(B.resolve(true));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'mvn was found at /a/b/c/d/mvn'
      });
      mocks.verify();
    });
    it('diagnose - failure - not in path ', async function () {
      process.env.PATH = '/a/b/c/d;/e/f/g/h';
      mocks.fs.expects('which').once().returns(
        B.resolve({stack: 'mvn not found'}));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'mvn is MISSING in PATH: /a/b/c/d;/e/f/g/h'
      });
      mocks.verify();
    });
    it('diagnose - failure - invalid path', async function () {
      process.env.PATH = '/a/b/c/d;/e/f/g/h';
      mocks.fs.expects('which').once().returns(
        B.resolve('/a/b/c/d/mvn'));
      mocks.fs.expects('exists').once().returns(B.resolve(false));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'mvn is MISSING in PATH: /a/b/c/d;/e/f/g/h'
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.equal('Manually install the mvn binary and add it to PATH.');
    });
  }));
  describe('AndroidSdkExists', withMocks({fs}, (mocks) => {
    stubEnv();
    let check = new AndroidSdkExists('android-16');
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(B.resolve(true));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'android-16 was found at: /a/b/c/d/platforms/android-16'
      });
      mocks.verify();
    });
    it('failure - missing android home', async function () {
      delete process.env.ANDROID_HOME;
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'android-16 could not be found because ANDROID_HOME is NOT set!'
      });
      mocks.verify();
    });
    it('diagnose - failure - invalid path', async function () {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(B.resolve(false));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'android-16 could NOT be found at \'/a/b/c/d/platforms/android-16\'!'
      });
      mocks.verify();
    });
    it('fix - ANDROID_HOME', async function () {
      delete process.env.ANDROID_HOME;
      removeColors(await check.fix()).should.equal('Manually configure ANDROID_HOME.');
    });
    it('fix - install', async function () {
      process.env.ANDROID_HOME = '/a/b/c/d';
      removeColors(await check.fix()).should.equal('Manually install the android-16 sdk.');
    });
  }));
});
