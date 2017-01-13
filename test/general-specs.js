// transpile:mocha

import { NodeBinaryCheck, NodeVersionCheck } from '../lib/general';
import * as tp from 'teen_process';
import NodeDetector from '../lib/node-detector';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { withMocks, verify } from 'appium-test-support';


chai.should();
chai.use(chaiAsPromised);
let P = Promise;

describe('general', () => {
  describe('NodeBinaryCheck', withMocks({NodeDetector}, (mocks) => {
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

  describe('NodeVersionCheck', withMocks({NodeDetector, tp}, (mocks) => {
    let check = new NodeVersionCheck();
    it('autofix', () => {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async () => {
      mocks.NodeDetector.expects('detect').once().returns(P.resolve('/a/b/c/d'));
      mocks.tp.expects('exec').once().returns(P.resolve({stdout: 'v4.5.6', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        message: 'Node version is 4.5.6'
      });
      verify(mocks);
    });
    it('diagnose - failure - insufficient version', async () => {
      mocks.NodeDetector.expects('detect').once().returns(P.resolve('/a/b/c/d'));
      mocks.tp.expects('exec').once().returns(P.resolve({stdout: 'v0.12.18', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: 'Node version should be at least 4!'
      });
      verify(mocks);
    });
    it('diagnose - failure - bad output', async () => {
      mocks.NodeDetector.expects('detect').once().returns(P.resolve('/a/b/c/d'));
      mocks.tp.expects('exec').once().returns(P.resolve({stdout: 'blahblahblah', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        message: `Unable to find node version (version = 'blahblahblah')`
      });
      verify(mocks);
    });
    it('fix', async () => {
      (await check.fix()).should.equal('Manually upgrade Node.js.');
    });
  }));
});
