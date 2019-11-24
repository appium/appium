// transpile:mocha

import { fixes, XcodeCheck, XcodeCmdLineToolsCheck, DevToolsSecurityCheck,
         AuthorizationDbCheck, CarthageCheck, OptionalApplesimutilsCommandCheck,
         OptionalIdbCommandCheck, OptionalIOSDeployCommandCheck } from '../lib/ios';
import { fs, system } from 'appium-support';
import * as utils from '../lib/utils';
import * as tp from 'teen_process';
import * as prompter from '../lib/prompt';
import CarthageDetector from '../lib/carthage-detector';
import FixSkippedError from '../lib/doctor';
import log from '../lib/logger';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import B from 'bluebird';
import { withMocks, withSandbox, stubLog } from 'appium-test-support';
import {removeColors} from './helper';

chai.should();
chai.use(chaiAsPromised);

describe('ios', function () {
  describe('XcodeCheck', withMocks({tp, fs}, (mocks) => {
    let check = new XcodeCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      // xcrun
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: 'usage: simctl [--set <path>] [--profiles <path>] <subcommand> ...', stderr: ''}));
      // xcode-select
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '/a/b/c/d\n', stderr: ''}));
      mocks.fs.expects('exists').once().returns(B.resolve(true));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'Xcode is installed at: /a/b/c/d'
      });
      mocks.verify();
    });
    it('diagnose - failure - xcode-select', async function () {
      // xcrun
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: 'usage: simctl [--set <path>] [--profiles <path>] <subcommand> ...', stderr: ''}));
      // xcode-select
      mocks.tp.expects('exec').once().returns(B.reject(new Error('Something wrong!')));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'Xcode is NOT installed!'
      });
      mocks.verify();
    });
    it('diagnose - failure - path not exists', async function () {
      // xcrun
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: 'usage: simctl [--set <path>] [--profiles <path>] <subcommand> ...', stderr: ''}));
      // xcode-select
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '/a/b/c/d\n', stderr: ''}));
      mocks.fs.expects('exists').once().returns(B.resolve(false));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'Xcode cannot be found at \'/a/b/c/d\'!'
      });
      mocks.verify();
    });
    it('diagnose - failure - xcrun does not work', async function () {
      // xcrun
      mocks.tp.expects('exec').once().returns(B.reject(new Error('xcrun: error: unable to find utility "simctl", not a developer tool or in PATH')));
      // no xcode-select
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'Xcode is NOT installed!'
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.equal("Manually install Xcode, and make sure 'xcode-select -p' command shows proper path like '/Applications/Xcode.app/Contents/Developer'");
    });
  }));
  describe('XcodeCmdLineToolsCheck', withSandbox({mocks: {tp, utils, prompter, system}}, (S) => {
    let check = new XcodeCmdLineToolsCheck();
    it('autofix', function () {
      check.autofix.should.be.ok;
    });
    it('diagnose - success', async function () {
      S.mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '/Applications/Xcode.app/Contents/Developer\n', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'Xcode Command Line Tools are installed in: /Applications/Xcode.app/Contents/Developer'
      });
      S.verify();
    });
    it('diagnose - failure - pkgutil crash', async function () {
      S.mocks.tp.expects('exec').once().throws(new Error('Something wrong!'));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'Xcode Command Line Tools are NOT installed!'
      });
      S.verify();
    });
    it('diagnose - failure - xcode-select -p returns status 2', async function () {
      S.mocks.tp.expects('exec').once().throws(new Error());
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'Xcode Command Line Tools are NOT installed!'
      });
      S.verify();
    });
    it('fix - yes', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      S.mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '', stderr: ''}));
      S.mocks.prompter.expects('fixIt').once().returns(B.resolve('yes'));
      await check.fix();
      S.verify();
      logStub.output.should.equal([
        'info: The following command need be executed: xcode-select --install',
      ].join('\n'));
    });
    it('fix - no', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      S.mocks.tp.expects('exec').never();
      S.mocks.prompter.expects('fixIt').once().returns(B.resolve('no'));
      await check.fix().should.be.rejectedWith(FixSkippedError);
      S.verify();
      logStub.output.should.equal([
        'info: The following command need be executed: xcode-select --install',
        'info: Skipping you will need to install Xcode manually.'
      ].join('\n'));
    });
  }));

  describe('authorizeIosFix', withSandbox({mocks: {utils, prompter}}, (S) => {
    it('fix - yes', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      S.mocks.utils.expects('authorizeIos').once();
      S.mocks.prompter.expects('fixIt').once().returns(B.resolve('yes'));
      await fixes.authorizeIosFix();
      S.verify();
      logStub.output.should.equal([
        'info: The authorize iOS script need to be run.',
      ].join('\n'));
    });
    it('fix - no', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      S.mocks.utils.expects('authorizeIos').never();
      S.mocks.prompter.expects('fixIt').once().returns(B.resolve('no'));
      await fixes.authorizeIosFix().should.be.rejectedWith(FixSkippedError);
      S.verify();
      logStub.output.should.equal([
        'info: The authorize iOS script need to be run.',
        'info: Skipping you will need to run the authorize iOS manually.'
      ].join('\n'));
    });
  }));
  describe('DevToolsSecurityCheck', withMocks({fixes, tp}, (mocks) => {
    let check = new DevToolsSecurityCheck();
    it('autofix', function () {
      check.autofix.should.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '1234 enabled\n', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'DevToolsSecurity is enabled.'
      });
      mocks.verify();
    });
    it('diagnose - failure - DevToolsSecurity crash', async function () {
      mocks.tp.expects('exec').once().returns(B.reject(new Error('Something wrong!')));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'DevToolsSecurity is NOT enabled!'
      });
      mocks.verify();
    });
    it('diagnose - failure - not enabled', async function () {
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '1234 abcd\n', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'DevToolsSecurity is NOT enabled!'
      });
      mocks.verify();
    });
    it('fix', async function () {
      mocks.fixes.expects('authorizeIosFix').once();
      await check.fix();
      mocks.verify();
    });
  }));
  describe('AuthorizationDbCheck', withMocks({fixes, tp, fs, utils, system}, (mocks) => {
    let check = new AuthorizationDbCheck();
    it('autofix', function () {
      check.autofix.should.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '1234 is-developer\n', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'The Authorization DB is set up properly.'
      });
      mocks.verify();
    });
    it('diagnose - failure', async function () {
      mocks.tp.expects('exec').once().returns(B.reject(new Error('Oh No!')));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'The Authorization DB is NOT set up properly.'
      });
      mocks.verify();
    });
    it('fix', async function () {
      mocks.fixes.expects('authorizeIosFix').once();
      await check.fix();
      mocks.verify();
    });
  }));
  describe('CarthageCheck', withMocks({CarthageDetector, tp}, (mocks) => {
    let check = new CarthageCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.CarthageDetector.expects('detect').once().returns(B.resolve('/usr/local/bin/carthage'));
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: 'Please update to the latest Carthage version: 0.33.0. You currently are on 0.32.0\n0.32.0\n', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'Carthage was found at: /usr/local/bin/carthage. Installed version is: 0.32.0'
      });
      mocks.verify();
    });
    it('diagnose - success - one line carthage version', async function () {
      mocks.CarthageDetector.expects('detect').once().returns(B.resolve('/usr/local/bin/carthage'));
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '0.32.0\n', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'Carthage was found at: /usr/local/bin/carthage. Installed version is: 0.32.0'
      });
      mocks.verify();
    });
    it('diagnose - success - but error happens', async function () {
      mocks.CarthageDetector.expects('detect').once().returns(B.resolve('/usr/local/bin/carthage'));
      mocks.tp.expects('exec').once().throws(new Error());
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'Carthage was found at: /usr/local/bin/carthage'
      });
      mocks.verify();
    });
    it('diagnose - failure', async function () {
      mocks.CarthageDetector.expects('detect').once().returns(B.resolve(null));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'Carthage was NOT found!'
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.equal('Please install Carthage. Visit https://github.com/Carthage/Carthage#installing-carthage for more information.');
    });
  }));

  describe('OptionalIdbCommandCheck', withMocks({tp, utils}, (mocks) => {
    let check = new OptionalIdbCommandCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns('path/to/idb');
      mocks.utils.expects('resolveExecutablePath').once().returns('path/to/idb_cpmpanion');
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: true,
        message: 'idb and idb_companion are installed'
      });
      mocks.verify();
    });
    it('diagnose - failure because of no idb_companion and idb', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns(false);
      mocks.utils.expects('resolveExecutablePath').once().returns(false);
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: true,
        message: 'idb and idb_companion are not installed'
      });
      mocks.verify();
    });
    it('diagnose - failure because of no idb_companion', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns('path/to/idb');
      mocks.utils.expects('resolveExecutablePath').once().returns(false);
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: true,
        message: 'idb_companion is not installed'
      });
      mocks.verify();
    });
    it('diagnose - failure because of no idb', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns(false);
      mocks.utils.expects('resolveExecutablePath').once().returns('path/to/idb_cpmpanion');
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: true,
        message: 'idb is not installed'
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.equal('Why idb is needed and how to install it: https://github.com/appium/appium-idb');
    });
  }));

  describe('OptionalApplesimutilsCommandCheck', withMocks({tp, utils}, (mocks) => {
    let check = new OptionalApplesimutilsCommandCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns('path/to/applesimutils');
      mocks.tp.expects('exec').once().returns({stdout: 'vxx.xx.xx', stderr: ''});
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: true,
        message: 'applesimutils is installed at: path/to/applesimutils. Installed versions are: vxx.xx.xx'
      });
      mocks.verify();
    });
    it('diagnose - failure', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns(false);
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: true,
        message: 'applesimutils cannot be found'
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.equal('Why applesimutils is needed and how to install it: http://appium.io/docs/en/drivers/ios-xcuitest/');
    });
  }));

  describe('OptionalIOSDeployCommandCheck', withMocks({tp, utils}, (mocks) => {
    let check = new OptionalIOSDeployCommandCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns('path/to/ios-deploy');
      mocks.tp.expects('exec').once().returns({stdout: '1.9.4', stderr: ''});
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: true,
        message: 'ios-deploy is installed at: path/to/ios-deploy. Installed version is: 1.9.4'
      });
      mocks.verify();
    });
    it('diagnose - failure', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns(false);
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: true,
        message: 'ios-deploy cannot be found'
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.equal('ios-deploy is used as a fallback command to install iOS applications to real device. Please read https://github.com/ios-control/ios-deploy/ to install it');
    });
  }));
});
