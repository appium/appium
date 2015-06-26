// transpile:mocha

import chai from 'chai';
import 'mochawait';
import { fs } from '../lib/utils';
import * as tp from 'teen_process';
import NodeDetector from '../lib/node-detector';
import B from 'bluebird';
import { withMocks, verifyAll, getSandbox } from './mock-utils';

chai.should();
let expect = chai.expect;

describe('NodeDetector', withMocks({fs, tp}, (mocks) => {

 it('retrieveInCommonPlaces - success', async () => {
    mocks.fs.expects('exists').once().returns(B.resolve(true));
    (await NodeDetector.retrieveInCommonPlaces())
      .should.equal('/usr/local/bin/node');
    verifyAll(mocks);
  });

  it('retrieveInCommonPlaces - failure', async () => {
    mocks.fs.expects('exists').twice().returns(B.resolve(false));
    expect(await NodeDetector.retrieveInCommonPlaces()).to.be.a('null');
    verifyAll(mocks);
  });

  // retrieveUsingWhichCommand
  let testRetrieveWithScript = (method) => {
    it(method + ' - success', async () => {
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '/a/b/c/d\n', stderr: ''}));
      mocks.fs.expects('exists').once().returns(B.resolve(true));
      (await NodeDetector[method]())
        .should.equal('/a/b/c/d');
      verifyAll(mocks);
    });

    it(method + ' - failure - path not found ', async () => {
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: 'aaa not found\n', stderr: ''}));
      expect(await NodeDetector[method]()).to.be.a('null');
      verifyAll(mocks);
    });
    it(method + ' - failure - path not exist', async () => {
      mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '/a/b/c/d\n', stderr: ''}));
      mocks.fs.expects('exists').once().returns(B.resolve(false));
      expect(await NodeDetector[method]()).to.be.a('null');
    });
  };

  testRetrieveWithScript('retrieveUsingWhichCommand');
  testRetrieveWithScript('retrieveUsingAppleScript');

  it('retrieveUsingAppiumConfigFile - success', async () => {
    mocks.fs.expects('exists').twice().returns(B.resolve(true));
    mocks.fs.expects('readFile').once().returns(
      B.resolve('{"node_bin": "/a/b/c/d"}'));
    (await NodeDetector.retrieveUsingAppiumConfigFile())
      .should.equal('/a/b/c/d');
    verifyAll(mocks);
  });

  it('retrieveUsingAppiumConfigFile - failure - not json', async () => {
    mocks.fs.expects('exists').once().returns(B.resolve(true));
    mocks.fs.expects('readFile').once().returns(
      B.resolve('{node_bin: "/a/b/c/d"}'));
    expect(await NodeDetector.retrieveUsingAppiumConfigFile())
      .to.be.a('null');
    verifyAll(mocks);
  });

  it('retrieveUsingAppiumConfigFile - failure - path does not exist', async () => {
    mocks.fs.expects('exists').once().returns(B.resolve(true));
    mocks.fs.expects('exists').once().returns(B.resolve(false));
    mocks.fs.expects('readFile').once().returns(
      B.resolve('{"node_bin": "/a/b/c/d"}'));
    expect(await NodeDetector.retrieveUsingAppiumConfigFile())
      .to.be.a('null');
    verifyAll(mocks);
  });

  it('checkForNodeBinary - success', async () => {
    mocks.NodeDetector = getSandbox(mocks).mock(NodeDetector);
    mocks.NodeDetector.expects('retrieveInCommonPlaces').once().returns(null);
    mocks.NodeDetector.expects('retrieveUsingWhichCommand').once().returns(null);
    mocks.NodeDetector.expects('retrieveUsingAppleScript').returns('/a/b/c/d');
    mocks.NodeDetector.expects('retrieveUsingAppiumConfigFile').never();
    (await NodeDetector.detect()).should.equal('/a/b/c/d');
    verifyAll(mocks);
  });

  it('checkForNodeBinary - failure', async () => {
    mocks.NodeDetector = getSandbox(mocks).mock(NodeDetector);
    mocks.NodeDetector.expects('retrieveInCommonPlaces').once().returns(null);
    mocks.NodeDetector.expects('retrieveUsingWhichCommand').once().returns(null);
    mocks.NodeDetector.expects('retrieveUsingAppleScript').once().returns(null);
    mocks.NodeDetector.expects('retrieveUsingAppiumConfigFile').once().returns(null);
    expect(await NodeDetector.detect()).to.be.a('null');
    verifyAll(mocks);
  });

}));
