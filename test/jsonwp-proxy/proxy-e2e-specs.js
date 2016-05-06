// transpile:mocha
/* global describe:true, it:true, before:true, after:true */

import { JWProxy } from '../..';
import cp from 'child_process';
import chai from 'chai';
import { sleep } from 'asyncbox';
import chromedriver from 'chromedriver';
import chaiAsPromised from 'chai-as-promised';


let should = chai.should();
chai.use(chaiAsPromised);

describe('proxy', () => {
  let cdProc = null;
  let j = new JWProxy();
  before(async () => {
    cdProc = cp.spawn(chromedriver.path, ['--url-base=/wd/hub', '--port=4444']);
    await sleep(1000);
  });
  after(async () => {
    cdProc.kill();
    await sleep(500);
  });

  it('should proxy status straight', async () => {
    let [res, resBody] = await j.proxy('/status', 'GET');
    resBody = JSON.parse(resBody);
    res.statusCode.should.equal(200);
    resBody.status.should.equal(0);
    resBody.value.should.have.property('build');
  });
  it('should proxy status as command', async () => {
    let res = await j.command('/status', 'GET');
    res.should.have.property('build');
  });
  it('should start a new session', async () => {
    let caps = {browserName: 'chrome'};
    let res = await j.command('/session', 'POST', {desiredCapabilities: caps});
    res.should.have.property('browserName');
    j.sessionId.should.have.length(32);
  });
  it('should quit a session', async () => {
    let res = await j.command('', 'DELETE');
    should.not.exist(res);
  });
});
