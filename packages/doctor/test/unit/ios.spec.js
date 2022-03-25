import {
  fixes, XcodeCheck, XcodeCmdLineToolsCheck, DevToolsSecurityCheck,
  OptionalApplesimutilsCommandCheck, OptionalIdbCommandCheck, OptionalIOSDeployCommandCheck,
  OptionalLyftCommandCheck
} from '../../lib/ios';
import { fs, system } from '@appium/support';
import * as utils from '../../lib/utils';
import * as tp from 'teen_process';
import * as prompter from '../../lib/prompt';
import FixSkippedError from '../../lib/doctor';
import log from '../../lib/logger';
import B from 'bluebird';
import { withMocks, withSandbox, stubLog } from '@appium/test-support';
import {removeColors} from './helper';


describe('ios', function () {
  describe('XcodeCheck', withMocks({tp, fs}, (mocks) => {
    let check = new XcodeCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      // xcrun
      mocks.tp.expects('exec').once().resolves(
        {stdout: 'usage: simctl [--set <path>] [--profiles <path>] <subcommand> ...', stderr: ''});
      // xcode-select
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '/a/b/c/d\n', stderr: ''}));
      mocks.fs.expects('exists').once().resolves(true);
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
      mocks.tp.expects('exec').once().rejects(new Error('Something wrong!'));
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
      mocks.fs.expects('exists').once().resolves(false);
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'Xcode cannot be found at \'/a/b/c/d\'!'
      });
      mocks.verify();
    });
    it('diagnose - failure - xcrun does not work', async function () {
      // xcrun
      mocks.tp.expects('exec').once().rejects(new Error('xcrun: error: unable to find utility "simctl", not a developer tool or in PATH'));
      // no xcode-select
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'Error running xcrun simctl'
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
      S.mocks.prompter.expects('fixIt').once().resolves('yes');
      await check.fix();
      S.verify();
      logStub.output.should.equal([
        'info: The following command need be executed: xcode-select --install',
      ].join('\n'));
    });
    it('fix - no', async function () {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      S.mocks.tp.expects('exec').never();
      S.mocks.prompter.expects('fixIt').once().resolves('no');
      await check.fix().should.be.rejectedWith(FixSkippedError);
      S.verify();
      logStub.output.should.equal([
        'info: The following command need be executed: xcode-select --install',
        'info: Skipping you will need to install Xcode manually.'
      ].join('\n'));
    });
  }));
  describe('DevToolsSecurityCheck', withMocks({fixes, tp}, (mocks) => {
    let check = new DevToolsSecurityCheck();
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
      mocks.tp.expects('exec').once().rejects(new Error('Something wrong!'));
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
  }));

  describe('OptionalLyftCommandCheck', withMocks({tp, utils}, (mocks) => {
    let check = new OptionalLyftCommandCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns('path/to/set-simulator-location');
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: true,
        message: 'set-simulator-location is installed'
      });
      mocks.verify();
    });
    it('diagnose - failure', async function () {
      mocks.utils.expects('resolveExecutablePath').once().returns(false);
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: true,
        message: 'set-simulator-location is not installed'
      });
      mocks.verify();
    });
    it('fix', async function () {
      removeColors(await check.fix()).should.equal('set-simulator-location is needed to set location for Simulator. ' +
        'Please read https://github.com/lyft/set-simulator-location to install it');
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
      removeColors(await check.fix()).should.equal('Why idb is needed and how to install it: https://git.io/JnxQc');
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
