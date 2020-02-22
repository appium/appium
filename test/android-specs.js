// transpile:mocha

import { EnvVarAndPathCheck, AndroidToolCheck, OptionalAppBundleCheck, OptionalGstreamerCheck } from '../lib/android';
import { fs } from 'appium-support';
import * as utils from '../lib/utils';
import * as tp from 'teen_process';
import chai from 'chai';
import { withMocks, stubEnv } from 'appium-test-support';
import B from 'bluebird';
import {removeColors} from './helper';

chai.should();

describe('android', function () {
  describe('EnvVarAndPathCheck', withMocks({fs}, (mocks) => {
    stubEnv();
    let check = new EnvVarAndPathCheck('ANDROID_HOME');
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(B.resolve(true));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'ANDROID_HOME is set to: /a/b/c/d'
      });
      mocks.verify();
    });
    it('failure - not set', async function () {
      delete process.env.ANDROID_HOME;
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'ANDROID_HOME is NOT set!'
      });
      mocks.verify();
    });
    it('failure - file not exists', async function () {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(B.resolve(false));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'ANDROID_HOME is set to \'/a/b/c/d\' ' +
          'but this is NOT a valid path!'
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.equal('Manually configure ANDROID_HOME.');
    });
  }));
  describe('AndroidToolCheck', withMocks({fs}, (mocks) => {
    stubEnv();
    let check = new AndroidToolCheck('adb', 'platform-tools/adb');
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(B.resolve(true));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'adb exists at: /a/b/c/d/platform-tools/adb'
      });
      mocks.verify();
    });
    it('diagnose - failure - no ANDROID_HOME', async function () {
      delete process.env.ANDROID_HOME;
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'adb could not be found because ANDROID_HOME is NOT set!'
      });
      mocks.verify();
    });
    it('diagnose - failure - path not valid', async function () {
      process.env.ANDROID_HOME = '/a/b/c/d';
      mocks.fs.expects('exists').once().returns(B.resolve(false));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'adb could NOT be found at \'/a/b/c/d/platform-tools/adb\'!'
      });
      mocks.verify();
    });
    it('fix - ANDROID_HOME', async function () {
      delete process.env.ANDROID_HOME;
      removeColors(await check.fix()).should.equal('Manually configure ANDROID_HOME ' +
        'and run appium-doctor again.');
    });
    it('fix - install', async function () {
      process.env.ANDROID_HOME = '/a/b/c/d';
      removeColors(await check.fix()).should.equal('Manually install adb and add it to PATH.');
    });
  }));

  describe('OptionalAppBundleCheck', withMocks({tp, utils}, (mocks) => {
    let check = new OptionalAppBundleCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns('path/to/bundletool.jar');
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: true,
        message: 'bundletool.jar is installed at: path/to/bundletool.jar'
      });
      mocks.verify();
    });
    it('diagnose - failure', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns(false);
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: true,
        message: 'bundletool.jar cannot be found'
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.equal('bundletool.jar is used to handle Android App Bundle. Please read http://appium.io/docs/en/writing-running-appium/android/android-appbundle/ to install it');
    });
  }));

  describe('OptionalGstreamerCheck', withMocks({tp, utils}, (mocks) => {
    let check = new OptionalGstreamerCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns('path/to/gst-launch');
      mocks.utils.expects('resolveExecutablePath').once().returns('path/to/gst-inspect');
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: true,
        message: 'gst-launch-1.0 and gst-inspect-1.0 are installed at: path/to/gst-launch and path/to/gst-inspect'
      });
      mocks.verify();
    });
    it('diagnose - failure', async function () {
      mocks.utils.expects('resolveExecutablePath').twice().returns(false);
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: true,
        message: 'gst-launch-1.0 and/or gst-inspect-1.0 cannot be found'
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.equal('gst-launch-1.0 and gst-inspect-1.0 are used to stream the screen of the device under test. ' +
        'Please read https://appium.io/docs/en/writing-running-appium/android/android-screen-streaming/ to install them and for more details');
    });
  }));
});
