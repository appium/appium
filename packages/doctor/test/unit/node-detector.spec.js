import {fs, system} from '@appium/support';
import NodeDetector from '../../lib/node-detector';
import B from 'bluebird';
import {withSandbox} from '@appium/test-support';

describe(
  'NodeDetector',
  withSandbox({mocks: {fs, system}}, (S) => {
    let expect;

    before(async function () {
      const chai = await import('chai');
      chai.should();
      expect = chai.expect;
    });


    it('retrieveUsingSystemCall - success - where returns multiple lines ', async function () {
      S.mocks.fs.expects('which').once().returns(B.resolve('/a/b/node.exe'));
      S.mocks.fs.expects('exists').once().returns(B.resolve(true));
      (await NodeDetector.retrieveUsingSystemCall()).should.equal('/a/b/node.exe');
      S.verify();
    });
    it('retrieveUsingSystemCall - success', async function () {
      S.mocks.fs.expects('which').once().returns(B.resolve('/a/b/c/d/node'));
      S.mocks.fs.expects('exists').once().returns(B.resolve(true));
      (await NodeDetector.retrieveUsingSystemCall()).should.equal('/a/b/c/d/node');
      S.verify();
    });
    it('retrieveUsingSystemCall - failure - path not found ', async function () {
      S.mocks.fs.expects('which').once().throws(Error('not found: carthage'));
      expect(await NodeDetector.retrieveUsingSystemCall()).to.be.a('null');
      S.verify();
    });
    it('retrieveUsingSystemCall - failure - path not exist', async function () {
      S.mocks.fs.expects('which').once().returns(B.resolve('/a/b/c/d'));
      S.mocks.fs.expects('exists').once().returns(B.resolve(false));
      expect(await NodeDetector.retrieveUsingSystemCall()).to.be.a('null');
    });

    it('checkForNodeBinary - failure', async function () {
      S.mocks.NodeDetector = S.sandbox.mock(NodeDetector);
      S.mocks.NodeDetector.expects('retrieveUsingSystemCall').once().returns(null);
      expect(await NodeDetector.detect()).to.be.a('null');
      S.verify();
    });
  })
);
