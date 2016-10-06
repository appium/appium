// transpile:mocha

import { fixes, XcodeCheck, XcodeCmdLineToolsCheck, DevToolsSecurityCheck,
  AuthorizationDbCheck, NodeBinaryCheck, CarthageCheck } from '../lib/ios';
import { fs } from 'appium-support';
import * as utils from '../lib/utils';
import * as tp from 'teen_process';
import * as prompter from '../lib/prompt';
import NodeDetector from '../lib/node-detector';
import CarthageDetector from '../lib/carthage-detector';
import FixSkippedError from '../lib/doctor';
import log from '../lib/logger';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import B from 'bluebird';
import { withMocks, verify, stubLog } from 'appium-test-support';
import { system } from 'appium-support';

chai.should();
chai.use(chaiAsPromised);
let P = Promise;

describe('ios', () => {
  describe('XcodeCheck', withMocks({tp, fs} ,(mocks) => {
    let check = new XcodeCheck();
    it('autofix', () => {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async () => {
      mocks.tp.expects('exec').once().returns(
        P.resolve({stdout: '/a/b/c/d\n', stderr: ''}));
      mocks.fs.expects('exists').once().returns(P.resolve(true));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        message: 'Xcode is installed at: /a/b/c/d'
      });
      verify(mocks);
    });
    it('diagnose - failure - xcode-select', async () => {
      mocks.tp.expects('exec').once().returns(P.reject(new Error('Something wrong!')));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'Xcode is NOT installed!'
      });
      verify(mocks);
    });
    it('diagnose - failure - path not exists', async () => {
      mocks.tp.expects('exec').once().returns(
        P.resolve({stdout: '/a/b/c/d\n', stderr: ''}));
      mocks.fs.expects('exists').once().returns(P.resolve(false));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'Xcode cannot be found at \'/a/b/c/d\'!'
      });
      verify(mocks);
    });
    it('fix', async () => {
      (await check.fix()).should.equal('Manually install Xcode.');
    });
  }));
  describe('XcodeCmdLineToolsCheck', withMocks({tp, utils, prompter, system} ,(mocks, S) => {
    let check = new XcodeCmdLineToolsCheck();
    it('autofix', () => {
      check.autofix.should.be.ok;
    });
    it('diagnose - success', async () => {
      mocks.system.expects('macOsxVersion').once().returns(P.resolve('10.10'));
      mocks.tp.expects('exec').once().returns(
        P.resolve({stdout: '1234 install-time\n', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        message: 'Xcode Command Line Tools are installed.'
      });
      verify(mocks);
    });
    it('diagnose - failure - pkgutil crash', async () => {
      mocks.system.expects('macOsxVersion').once().returns(B.resolve('10.10'));
      mocks.tp.expects('exec').once().returns(Promise.reject(new Error('Something wrong!')));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'Xcode Command Line Tools are NOT installed!'
      });
      verify(mocks);
    });
    it('diagnose - failure - no install time', async () => {
      mocks.system.expects('macOsxVersion').once().returns(B.resolve('10.10'));
      mocks.tp.expects('exec').once().returns(
        P.resolve({stdout: '1234 abcd\n', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'Xcode Command Line Tools are NOT installed!'
      });
      verify(mocks);
    });
    it('fix - yes', async () => {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      mocks.tp.expects('exec').once().returns(
        P.resolve({stdout: '', stderr: ''}));
      mocks.prompter.expects('fixIt').once().returns(P.resolve('yes'));
      await check.fix();
      verify(mocks);
      logStub.output.should.equal([
        'info: The following command need be executed: xcode-select --install',
      ].join('\n'));
    });
    it('fix - no', async () => {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      mocks.tp.expects('exec').never();
      mocks.prompter.expects('fixIt').once().returns(P.resolve('no'));
      await check.fix().should.be.rejectedWith(FixSkippedError);
      verify(mocks);
      logStub.output.should.equal([
        'info: The following command need be executed: xcode-select --install',
        'info: Skipping you will need to install Xcode manually.'
      ].join('\n'));
    });
  }));

  describe('authorizeIosFix', withMocks({utils, prompter} ,(mocks, S) => {
    it('fix - yes', async () => {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      mocks.utils.expects('authorize').once();
      mocks.prompter.expects('fixIt').once().returns(P.resolve('yes'));
      await fixes.authorizeIosFix();
      verify(mocks);
      logStub.output.should.equal([
        'info: The authorize iOS script need to be run.',
      ].join('\n'));
    });
    it('fix - no', async () => {
      let logStub = stubLog(S.sandbox, log, {stripColors: true});
      mocks.utils.expects('authorize').never();
      mocks.prompter.expects('fixIt').once().returns(P.resolve('no'));
      await fixes.authorizeIosFix().should.be.rejectedWith(FixSkippedError);
      verify(mocks);
      logStub.output.should.equal([
        'info: The authorize iOS script need to be run.',
        'info: Skipping you will need to run the authorize iOS manually.'
      ].join('\n'));
    });
  }));
  describe('DevToolsSecurityCheck', withMocks({fixes, tp} ,(mocks) => {
    let check = new DevToolsSecurityCheck();
    it('autofix', () => {
      check.autofix.should.be.ok;
    });
    it('diagnose - success', async () => {
      mocks.tp.expects('exec').once().returns(
        P.resolve({stdout: '1234 enabled\n', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        message: 'DevToolsSecurity is enabled.'
      });
      verify(mocks);
    });
    it('diagnose - failure - DevToolsSecurity crash', async () => {
      mocks.tp.expects('exec').once().returns(Promise.reject(new Error('Something wrong!')));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'DevToolsSecurity is NOT enabled!'
      });
      verify(mocks);
    });
    it('diagnose - failure - not enabled', async () => {
      mocks.tp.expects('exec').once().returns(
        P.resolve({stdout: '1234 abcd\n', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'DevToolsSecurity is NOT enabled!'
      });
      verify(mocks);
    });
    it('fix', async () => {
      mocks.fixes.expects('authorizeIosFix').once();
      await check.fix();
      verify(mocks);
    });
  }));
  describe('AuthorizationDbCheck', withMocks({fixes, tp, fs, utils, system} ,(mocks) => {
    let check = new AuthorizationDbCheck();
    it('autofix', () => {
      check.autofix.should.be.ok;
    });
    it('diagnose - success - 10.10', async () => {
      mocks.tp.expects('exec').once().returns(
        P.resolve({stdout: '1234 is-developer\n', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        message: 'The Authorization DB is set up properly.'
      });
      verify(mocks);
    });
    it('diagnose - success - 10.8', async () => {
      mocks.tp.expects('exec').once().returns(P.reject(new Error('Oh No!')));
      mocks.system.expects('macOsxVersion').once().returns(P.resolve('10.8'));
      mocks.fs.expects('readFile').once().returns(P.resolve(
        '<key>system.privilege.taskport</key> \n <dict>\n <key>allow-root</key>\n <true/>'));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        message: 'The Authorization DB is set up properly.'
      });
      verify(mocks);
    });
    it('diagnose - failure - 10.10 - security', async () => {
      mocks.tp.expects('exec').once().returns(P.reject(new Error('Oh No!')));
      mocks.system.expects('macOsxVersion').once().returns(P.resolve('10.10'));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'The Authorization DB is NOT set up properly.'
      });
      verify(mocks);
    });
    it('diagnose - failure - /etc/authorization', async () => {
      mocks.tp.expects('exec').once().returns(P.reject(new Error('Oh No!')));
      mocks.system.expects('macOsxVersion').once().returns(P.resolve('10.8'));
      mocks.fs.expects('readFile').once().returns(P.resolve(''));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'The Authorization DB is NOT set up properly.'
      });
      verify(mocks);
    });
    it('fix', async () => {
      mocks.fixes.expects('authorizeIosFix').once();
      await check.fix();
      verify(mocks);
    });
  }));
  describe('NodeBinaryCheck', withMocks({NodeDetector} ,(mocks) => {
    let check = new NodeBinaryCheck();
    it('autofix', () => {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async () => {
      mocks.NodeDetector.expects('detect').once().returns(P.resolve('/a/b/c/d'));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        message: 'The Node.js binary was found at: /a/b/c/d'
      });
      verify(mocks);
    });
    it('diagnose - failure', async () => {
      mocks.NodeDetector.expects('detect').once().returns(P.resolve(null));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'The Node.js binary was NOT found!'
      });
      verify(mocks);
    });
    it('fix', async () => {
      (await check.fix()).should.equal('Manually setup Node.js.');
    });
  }));
  describe('CarthageCheck', withMocks({CarthageDetector}, (mocks) => {
    let check = new CarthageCheck();
    it('autofix', () => {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async () => {
      mocks.CarthageDetector.expects('detect').once().returns(P.resolve('/usr/local/bin/carthage'));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        message: 'Carthage was found at: /usr/local/bin/carthage'
      });
      verify(mocks);
    });
    it('diagnose - failure', async () => {
      mocks.CarthageDetector.expects('detect').once().returns(P.resolve(null));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'Carthage was NOT found!'
      });
      verify(mocks);
    });
    it('fix', async () => {
      (await check.fix()).should.equal('Please install Carthage. Visit https://github.com/Carthage/Carthage#installing-carthage for more information.');
    });
  }));
});
