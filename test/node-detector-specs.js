// transpile:mocha

import chai from 'chai';
import { fs, system } from 'appium-support';
import * as tp from 'teen_process';
import NodeDetector from '../lib/node-detector';
import B from 'bluebird';
import { withSandbox } from 'appium-test-support';
import { EOL } from 'os';


chai.should();
let expect = chai.expect;

describe('NodeDetector', withSandbox({mocks: {fs, tp, system}}, (S) => {
  it('retrieveInCommonPlaces - success', async function () {
    S.mocks.fs.expects('exists').once().returns(B.resolve(true));
    (await NodeDetector.retrieveInCommonPlaces())
      .should.equal('/usr/local/bin/node');
    S.verify();
  });

  it('retrieveInCommonPlaces - failure', async function () {
    S.mocks.fs.expects('exists').twice().returns(B.resolve(false));
    expect(await NodeDetector.retrieveInCommonPlaces()).to.be.a('null');
    S.verify();
  });

  // retrieveUsingSystemCall
  let testRetrieveWithScript = (method) => {
    if (method === 'retrieveUsingAppleScript') {
      system.isMac = () => true;
    }
    it(method + ' - success', async function () {
      S.mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: `/a/b/c/d/node${EOL}`, stderr: ''}));
      S.mocks.fs.expects('exists').once().returns(B.resolve(true));
      (await NodeDetector[method]())
        .should.equal('/a/b/c/d/node');
      S.verify();
    });
    it(method + ' - failure - path not found ', async function () {
      S.mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: 'aaa not found\n', stderr: ''}));
      expect(await NodeDetector[method]()).to.be.a('null');
      S.verify();
    });
    it(method + ' - failure - path not exist', async function () {
      S.mocks.tp.expects('exec').once().returns(
        B.resolve({stdout: '/a/b/c/d\n', stderr: ''}));
      S.mocks.fs.expects('exists').once().returns(B.resolve(false));
      expect(await NodeDetector[method]()).to.be.a('null');
    });
  };

  testRetrieveWithScript('retrieveUsingSystemCall');
  testRetrieveWithScript('retrieveUsingAppleScript');

  it('testRetrieveWithScript - success - where returns multiple lines ', async function () {
    S.mocks.system.expects('isWindows').twice().returns(true);
    S.mocks.tp.expects('exec').once().returns(
      B.resolve({stdout: `/a/b/node${EOL}/c/d/e/node${EOL}`, stderr: ''}));
    S.mocks.fs.expects('exists').once().returns(B.resolve(true));
    (await NodeDetector.retrieveUsingSystemCall())
      .should.equal('/a/b/node');
    S.verify();
  });

  it('retrieveUsingAppiumConfigFile - success', async function () {
    S.mocks.fs.expects('exists').twice().returns(B.resolve(true));
    S.mocks.fs.expects('readFile').once().returns(
      B.resolve('{"node_bin": "/a/b/c/d"}'));
    (await NodeDetector.retrieveUsingAppiumConfigFile())
      .should.equal('/a/b/c/d');
    S.verify();
  });

  it('retrieveUsingAppiumConfigFile - failure - not json', async function () {
    S.mocks.fs.expects('exists').once().returns(B.resolve(true));
    S.mocks.fs.expects('readFile').once().returns(
      B.resolve('{node_bin: "/a/b/c/d"}'));
    expect(await NodeDetector.retrieveUsingAppiumConfigFile())
      .to.be.a('null');
    S.verify();
  });

  it('retrieveUsingAppiumConfigFile - failure - path does not exist', async function () {
    S.mocks.fs.expects('exists').once().returns(B.resolve(true));
    S.mocks.fs.expects('exists').once().returns(B.resolve(false));
    S.mocks.fs.expects('readFile').once().returns(
      B.resolve('{"node_bin": "/a/b/c/d"}'));
    expect(await NodeDetector.retrieveUsingAppiumConfigFile())
      .to.be.a('null');
    S.verify();
  });

  it('checkForNodeBinary - success', async function () {
    S.mocks.NodeDetector = S.sandbox.mock(NodeDetector);
    S.mocks.NodeDetector.expects('retrieveInCommonPlaces').once().returns(null);
    S.mocks.NodeDetector.expects('retrieveUsingSystemCall').once().returns(null);
    S.mocks.NodeDetector.expects('retrieveUsingAppleScript').returns('/a/b/c/d');
    S.mocks.NodeDetector.expects('retrieveUsingAppiumConfigFile').never();
    (await NodeDetector.detect()).should.equal('/a/b/c/d');
    S.verify();
  });

  it('checkForNodeBinary - failure', async function () {
    S.mocks.NodeDetector = S.sandbox.mock(NodeDetector);
    S.mocks.NodeDetector.expects('retrieveInCommonPlaces').once().returns(null);
    S.mocks.NodeDetector.expects('retrieveUsingSystemCall').once().returns(null);
    S.mocks.NodeDetector.expects('retrieveUsingAppleScript').once().returns(null);
    S.mocks.NodeDetector.expects('retrieveUsingAppiumConfigFile').once().returns(null);
    expect(await NodeDetector.detect()).to.be.a('null');
    S.verify();
  });
}));
