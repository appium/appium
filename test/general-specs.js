// transpile:mocha

import { NodeBinaryCheck, NodeVersionCheck, OptionalOpencv4nodejsCommandCheck } from '../lib/general';
import * as tp from 'teen_process';
import NodeDetector from '../lib/node-detector';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { withMocks } from 'appium-test-support';
import B from 'bluebird';


chai.should();
chai.use(chaiAsPromised);

describe('general', function () {
  describe('NodeBinaryCheck', withMocks({NodeDetector}, (mocks) => {
    let check = new NodeBinaryCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.NodeDetector.expects('detect').once().returns(B.resolve('/a/b/c/d'));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'The Node.js binary was found at: /a/b/c/d'
      });
      mocks.verify();
    });
    it('diagnose - failure', async function () {
      mocks.NodeDetector.expects('detect').once().returns(B.resolve(null));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'The Node.js binary was NOT found!'
      });
      mocks.verify();
    });
    it('fix', async function () {
      (await check.fix()).should.equal('Manually setup Node.js.');
    });
  }));

  describe('NodeVersionCheck', withMocks({NodeDetector, tp}, (mocks) => {
    let check = new NodeVersionCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.NodeDetector.expects('detect').once().returns(B.resolve('/a/b/c/d'));
      mocks.tp.expects('exec').once().returns(B.resolve({stdout: 'v4.5.6', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: false,
        message: 'Node version is 4.5.6'
      });
      mocks.verify();
    });
    it('diagnose - failure - insufficient version', async function () {
      mocks.NodeDetector.expects('detect').once().returns(B.resolve('/a/b/c/d'));
      mocks.tp.expects('exec').once().returns(B.resolve({stdout: 'v0.12.18', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: 'Node version should be at least 4!'
      });
      mocks.verify();
    });
    it('diagnose - failure - bad output', async function () {
      mocks.NodeDetector.expects('detect').once().returns(B.resolve('/a/b/c/d'));
      mocks.tp.expects('exec').once().returns(B.resolve({stdout: 'blahblahblah', stderr: ''}));
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: false,
        message: `Unable to find node version (version = 'blahblahblah')`
      });
      mocks.verify();
    });
    it('fix', async function () {
      (await check.fix()).should.equal('Manually upgrade Node.js.');
    });
  }));

  describe('OptionalOpencv4nodejsCommandCheck', withMocks({tp}, (mocks) => {
    let check = new OptionalOpencv4nodejsCommandCheck();
    it('autofix', function () {
      check.autofix.should.not.be.ok;
    });
    it('diagnose - success', async function () {
      mocks.tp.expects('exec').once().returns({stdout: '/path/to/opencv4nodejs', stderr: ''});
      (await check.diagnose()).should.deep.equal({
        ok: true,
        optional: true,
        message: 'opencv4nodejs is installed.'
      });
      mocks.verify();
    });
    it('diagnose - failure', async function () {
      mocks.tp.expects('exec').once().returns({stdout: 'not found', stderr: ''});
      (await check.diagnose()).should.deep.equal({
        ok: false,
        optional: true,
        message: 'opencv4nodejs cannot be found.'
      });
      mocks.verify();
    });
    it('fix', async function () {
      (await check.fix()).should.
        equal('Why opencv4nodejs is needed and how to install it is: https://github.com/appium/appium/blob/master/docs/en/writing-running-appium/image-comparison.md');
    });
  }));
});
